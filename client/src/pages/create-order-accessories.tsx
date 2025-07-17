import React, { useState, useCallback } from "react"
import * as XLSX from "xlsx"
import { useQuery } from "@tanstack/react-query"
import {
  Plus,
  Upload,
  FileSpreadsheet,
  Building2,
  CalendarDays,
  ArrowRight,
  ArrowLeft,
  Save,
  Settings,
  Camera,
  Wrench,
  Image as ImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"

interface CellData {
  value: any
  formula?: string
  displayValue?: any
}

interface ProjectSettings {
  siteName: string
  materialReceiver: string
  headOfficeManager: string
  specialNotes: string
  hardware: {
    deliveryDate: string
    supplier: string
    deliveryLocation: string
  }
  sealing: {
    deliveryDate: string
    supplier: string
    deliveryLocation: string
  }
  finishing: {
    deliveryDate: string
    supplier: string
    deliveryLocation: string
  }
}

interface SavedData {
  projectSettings: ProjectSettings
  spreadsheetData: CellData[][]
  fileName: string
  timestamp: string
}

// Formula Evaluator for Excel-like calculations
class FormulaEvaluator {
  private data: CellData[][]

  constructor(data: CellData[][]) {
    this.data = data
  }

  private getCellReference(cellRef: string): number {
    const match = cellRef.match(/([A-Z]+)(\d+)/)
    if (!match) return 0

    const col = this.columnToIndex(match[1])
    const row = parseInt(match[2]) - 1

    if (row < 0 || row >= this.data.length || col < 0 || col >= this.data[row].length) {
      return 0
    }

    const cellValue = this.data[row][col].value
    return typeof cellValue === "number" ? cellValue : parseFloat(cellValue) || 0
  }

  private columnToIndex(col: string): number {
    let result = 0
    for (let i = 0; i < col.length; i++) {
      result = result * 26 + (col.charCodeAt(i) - 64)
    }
    return result - 1
  }

  evaluate(formula: string): number {
    try {
      formula = formula.replace(/^=/, "").trim()

      if (formula.includes("SUM(")) {
        return this.evaluateSum(formula)
      }

      formula = formula.replace(/[A-Z]+\d+/g, (match) => {
        return this.getCellReference(match).toString()
      })

      return this.evaluateArithmetic(formula)
    } catch (error) {
      console.error("Formula evaluation error:", error)
      return 0
    }
  }

  private evaluateSum(formula: string): number {
    const sumMatch = formula.match(/SUM\(([^)]+)\)/i)
    if (!sumMatch) return 0

    const range = sumMatch[1].trim()
    const rangeMatch = range.match(/([A-Z]+\d+):([A-Z]+\d+)/i)

    if (rangeMatch) {
      const startRef = rangeMatch[1].toUpperCase()
      const endRef = rangeMatch[2].toUpperCase()
      return this.sumRange(startRef, endRef)
    }

    return 0
  }

  private sumRange(startRef: string, endRef: string): number {
    const startMatch = startRef.match(/([A-Z]+)(\d+)/)
    const endMatch = endRef.match(/([A-Z]+)(\d+)/)

    if (!startMatch || !endMatch) return 0

    const startCol = this.columnToIndex(startMatch[1])
    const startRow = parseInt(startMatch[2]) - 1
    const endCol = this.columnToIndex(endMatch[1])
    const endRow = parseInt(endMatch[2]) - 1

    let sum = 0
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        if (row >= 0 && row < this.data.length && col >= 0 && col < this.data[row].length) {
          const cellValue = this.data[row][col].value
          sum += typeof cellValue === "number" ? cellValue : parseFloat(cellValue) || 0
        }
      }
    }
    return sum
  }

  private evaluateArithmetic(formula: string): number {
    try {
      return Function(`"use strict"; return (${formula})`)()
    } catch (error) {
      console.error("Arithmetic evaluation error:", error)
      return 0
    }
  }
}

// Image upload dialog component
function ImageUploadDialog({ onImageUpload }: { onImageUpload: (file: File) => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      onImageUpload(file)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <Camera className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>부자재 이미지 업로드</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <ImageIcon className="w-8 h-8 mb-4 text-gray-500" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">클릭하여 업로드</span>
                </p>
                <p className="text-xs text-gray-500">PNG, JPG 파일 (최대 10MB)</p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
            </label>
          </div>
          {previewUrl && (
            <div className="mt-4">
              <img src={previewUrl} alt="미리보기" className="w-full h-32 object-cover rounded-lg" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function CreateAccessoriesOrder() {
  const [currentStep, setCurrentStep] = useState<"input" | "pdf-preview">("input")
  const [savedData, setSavedData] = useState<SavedData | null>(null)
  const [data, setData] = useState<CellData[][]>([])
  const [fileName, setFileName] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [shapeImages, setShapeImages] = useState<{ [key: number]: File | null }>({})

  // Project settings state
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
    siteName: "",
    materialReceiver: "",
    headOfficeManager: "",
    specialNotes: "",
    hardware: {
      deliveryDate: "",
      supplier: "",
      deliveryLocation: "",
    },
    sealing: {
      deliveryDate: "",
      supplier: "",
      deliveryLocation: "",
    },
    finishing: {
      deliveryDate: "",
      supplier: "",
      deliveryLocation: "",
    },
  })

  // Local state for dropdown management
  const [localDeliveryLocations, setLocalDeliveryLocations] = useState<string[]>([])
  const [localMaterialReceivers, setLocalMaterialReceivers] = useState<string[]>([])
  const [localHeadOfficeManagers, setLocalHeadOfficeManagers] = useState<string[]>([])

  // Fetch data from APIs
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  })

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  })

  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
  })

  const { data: companies = [] } = useQuery({
    queryKey: ["/api/companies"],
  })

  // Combine API data with local state
  const siteNames = [
    ...projects.map((p: any) => p.projectName),
    "기본 현장 A",
    "기본 현장 B",
  ]

  const materialReceivers = [
    ...users.map((u: any) => u.name),
    ...localMaterialReceivers,
    "기본 인수자 A",
    "기본 인수자 B",
  ]

  const headOfficeManagers = [
    ...users.map((u: any) => u.name),
    ...localHeadOfficeManagers,
    "기본 담당자 A",
    "기본 담당자 B",
  ]

  const suppliers = [
    ...vendors.map((v: any) => v.name),
    "기본 거래처 A",
    "기본 거래처 B",
  ]

  const deliveryLocations = [
    ...companies.map((c: any) => c.companyName),
    ...localDeliveryLocations,
    "기본 납품처 A",
    "기본 납품처 B",
  ]

  const addDeliveryLocation = (newLocation: string) => {
    setLocalDeliveryLocations((prev) => [...prev, newLocation])
  }

  const addMaterialReceiver = (newReceiver: string) => {
    setLocalMaterialReceivers((prev) => [...prev, newReceiver])
  }

  const addHeadOfficeManager = (newManager: string) => {
    setLocalHeadOfficeManagers((prev) => [...prev, newManager])
  }

  const handleBackToInput = () => {
    setCurrentStep("input")
  }

  const handleSaveAndNext = () => {
    const timestamp = new Date().toISOString()
    setSavedData({
      projectSettings: projectSettings,
      spreadsheetData: data,
      fileName: fileName,
      timestamp: timestamp,
    })
    setCurrentStep("pdf-preview")
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1")
        const parsedData: CellData[][] = []

        for (let row = range.s.r; row <= range.e.r; row++) {
          const rowData: CellData[] = []
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
            const cell = worksheet[cellAddress]

            if (cell) {
              const cellData: CellData = {
                value: cell.v,
                formula: cell.f,
                displayValue: cell.v,
              }
              rowData.push(cellData)
            } else {
              rowData.push({ value: "", displayValue: "" })
            }
          }
          parsedData.push(rowData)
        }

        setData(parsedData)
        setTimeout(() => recalculateFormulas(parsedData), 100)
      } catch (error) {
        console.error("Error parsing Excel file:", error)
        alert("파일을 읽는 중 오류가 발생했습니다.")
      } finally {
        setIsLoading(false)
      }
    }

    reader.readAsArrayBuffer(file)
  }

  const recalculateFormulas = useCallback((currentData: CellData[][]) => {
    const evaluator = new FormulaEvaluator(currentData)
    const newData = currentData.map((row) =>
      row.map((cell) => {
        if (cell.formula && cell.formula.startsWith("=")) {
          const result = evaluator.evaluate(cell.formula)
          return {
            ...cell,
            displayValue: result,
          }
        }
        return {
          ...cell,
          displayValue: cell.displayValue !== undefined ? cell.displayValue : cell.value,
        }
      }),
    )
    setData(newData)
  }, [])

  // PDF Preview 단계 렌더링
  if (currentStep === "pdf-preview" && savedData) {
    return (
      <div className="p-6 space-y-6">
        {/* PDF 미리보기 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Wrench className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">부자재 발주서 미리보기</h1>
              <p className="text-sm text-gray-600">저장된 발주서 내용을 확인하고 최종 제출하세요.</p>
            </div>
          </div>
          <Button
            onClick={handleBackToInput}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            수정하기
          </Button>
        </div>

        {/* 현장 정보 요약 */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              현장 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">현장명</Label>
                <p className="text-sm font-semibold">{savedData.projectSettings.siteName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">자재 인수자</Label>
                <p className="text-sm font-semibold">{savedData.projectSettings.materialReceiver}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">본사 담당자</Label>
                <p className="text-sm font-semibold">{savedData.projectSettings.headOfficeManager}</p>
              </div>
            </div>
            {savedData.projectSettings.specialNotes && (
              <div className="mt-4">
                <Label className="text-sm font-medium text-gray-600">특이사항</Label>
                <p className="text-sm">{savedData.projectSettings.specialNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 공정별 정보 요약 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 하드웨어 정보 */}
          <Card className="border-orange-200">
            <CardHeader className="bg-orange-50">
              <CardTitle className="text-orange-700 text-sm">하드웨어</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-600">납품희망일</Label>
                  <p className="text-sm font-medium">{savedData.projectSettings.hardware.deliveryDate}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">거래처</Label>
                  <p className="text-sm font-medium">{savedData.projectSettings.hardware.supplier}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">납품처</Label>
                  <p className="text-sm font-medium">{savedData.projectSettings.hardware.deliveryLocation}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 실링재 정보 */}
          <Card className="border-teal-200">
            <CardHeader className="bg-teal-50">
              <CardTitle className="text-teal-700 text-sm">실링재</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-600">납품희망일</Label>
                  <p className="text-sm font-medium">{savedData.projectSettings.sealing.deliveryDate}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">거래처</Label>
                  <p className="text-sm font-medium">{savedData.projectSettings.sealing.supplier}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">납품처</Label>
                  <p className="text-sm font-medium">{savedData.projectSettings.sealing.deliveryLocation}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 마감재 정보 */}
          <Card className="border-indigo-200">
            <CardHeader className="bg-indigo-50">
              <CardTitle className="text-indigo-700 text-sm">마감재</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-600">납품희망일</Label>
                  <p className="text-sm font-medium">{savedData.projectSettings.finishing.deliveryDate}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">거래처</Label>
                  <p className="text-sm font-medium">{savedData.projectSettings.finishing.supplier}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">납품처</Label>
                  <p className="text-sm font-medium">{savedData.projectSettings.finishing.deliveryLocation}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 스프레드시트 데이터 미리보기 */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-orange-600" />
              발주 품목 목록
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 mb-3">
              파일명: {savedData.fileName}
            </div>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {savedData.spreadsheetData[0]?.map((_, colIndex) => (
                      <th key={colIndex} className="px-3 py-2 text-left font-medium text-gray-700 border-r">
                        {String.fromCharCode(65 + colIndex)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {savedData.spreadsheetData.slice(0, 10).map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t">
                      {row.map((cell, colIndex) => (
                        <td key={colIndex} className="px-3 py-2 border-r">
                          {cell.displayValue || cell.value || ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {savedData.spreadsheetData.length > 10 && (
                <div className="p-3 text-center text-sm text-gray-500 bg-gray-50">
                  ... 그 외 {savedData.spreadsheetData.length - 10}개 행
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 최종 제출 버튼 */}
        <div className="flex justify-center gap-4 pt-6">
          <Button
            onClick={handleBackToInput}
            variant="outline"
            size="lg"
            className="flex items-center gap-2 px-6"
          >
            <ArrowLeft className="h-4 w-4" />
            이전 단계
          </Button>
          <Button
            size="lg"
            className="flex items-center gap-2 px-8 bg-orange-600 hover:bg-orange-700"
            onClick={() => {
              // TODO: 실제 발주서 제출 로직 구현
              alert("부자재 발주서가 성공적으로 제출되었습니다!")
            }}
          >
            <Save className="h-4 w-4" />
            최종 제출
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* 페이지 헤더 - UI Standards 적용 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
          <Wrench className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">부자재 발주서</h1>
          <p className="text-sm text-gray-600">부자재 공정 전용 발주서를 작성하고 관리합니다.</p>
        </div>
        <div className="ml-auto">
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            실험적 기능
          </Badge>
        </div>
      </div>

      {/* 현장 설정 섹션 - UI Standards 적용 */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">발주서 기본 정보</h2>
          </div>
          <div className="space-y-6">
            {/* 현장명, 자재 인수자, 본사 담당자 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">현장 명</Label>
                <Select
                  value={projectSettings.siteName}
                  onValueChange={(value) => setProjectSettings((prev) => ({ ...prev, siteName: value }))}
                >
                  <SelectTrigger className={`h-10 ${projectSettings.siteName ? "border-blue-500 bg-blue-50" : ""}`}>
                    <SelectValue placeholder="현장을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {siteNames.map((site) => (
                      <SelectItem key={site} value={site}>
                        {site}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">자재 인수자</Label>
                <div className="flex gap-2">
                  <Select
                    value={projectSettings.materialReceiver}
                    onValueChange={(value) => setProjectSettings((prev) => ({ ...prev, materialReceiver: value }))}
                  >
                    <SelectTrigger className={`h-10 ${projectSettings.materialReceiver ? "border-blue-500 bg-blue-50" : ""}`}>
                      <SelectValue placeholder="인수자 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {materialReceivers.map((receiver) => (
                        <SelectItem key={receiver} value={receiver}>
                          {receiver}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-10 w-10 p-0">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>새 자재 인수자 추가</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="자재 인수자 이름"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const value = e.currentTarget.value.trim()
                              if (value) {
                                addMaterialReceiver(value)
                                setProjectSettings((prev) => ({ ...prev, materialReceiver: value }))
                                e.currentTarget.value = ""
                              }
                            }
                          }}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">본사 담당자</Label>
                <div className="flex gap-2">
                  <Select
                    value={projectSettings.headOfficeManager}
                    onValueChange={(value) => setProjectSettings((prev) => ({ ...prev, headOfficeManager: value }))}
                  >
                    <SelectTrigger className={`h-10 ${projectSettings.headOfficeManager ? "border-blue-500 bg-blue-50" : ""}`}>
                      <SelectValue placeholder="담당자 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {headOfficeManagers.map((manager) => (
                        <SelectItem key={manager} value={manager}>
                          {manager}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-10 w-10 p-0">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>새 본사 담당자 추가</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          placeholder="본사 담당자 이름"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const value = e.currentTarget.value.trim()
                              if (value) {
                                addHeadOfficeManager(value)
                                setProjectSettings((prev) => ({ ...prev, headOfficeManager: value }))
                                e.currentTarget.value = ""
                              }
                            }
                          }}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>

            {/* 특이사항 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">특이사항</Label>
              <Textarea
                placeholder="특이사항을 입력하세요..."
                value={projectSettings.specialNotes}
                onChange={(e) => setProjectSettings((prev) => ({ ...prev, specialNotes: e.target.value }))}
                className="h-20"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 하드웨어 공정 설정 섹션 */}
      <Card className="hover:shadow-md transition-shadow border-orange-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">하드웨어</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">납품희망일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`h-10 w-full justify-start text-left font-normal ${
                      projectSettings.hardware.deliveryDate ? "border-orange-500 bg-orange-50" : ""
                    }`}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {projectSettings.hardware.deliveryDate || "날짜 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={projectSettings.hardware.deliveryDate ? new Date(projectSettings.hardware.deliveryDate) : undefined}
                    onSelect={(date) =>
                      setProjectSettings((prev) => ({
                        ...prev,
                        hardware: { ...prev.hardware, deliveryDate: date?.toISOString().split("T")[0] || "" },
                      }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">거래처</Label>
              <Select
                value={projectSettings.hardware.supplier}
                onValueChange={(value) => setProjectSettings((prev) => ({ ...prev, hardware: { ...prev.hardware, supplier: value } }))}
              >
                <SelectTrigger className={`h-10 ${projectSettings.hardware.supplier ? "border-orange-500 bg-orange-50" : ""}`}>
                  <SelectValue placeholder="거래처 선택" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">납품처</Label>
              <div className="flex gap-2">
                <Select
                  value={projectSettings.hardware.deliveryLocation}
                  onValueChange={(value) => setProjectSettings((prev) => ({ ...prev, hardware: { ...prev.hardware, deliveryLocation: value } }))}
                >
                  <SelectTrigger className={`h-10 ${projectSettings.hardware.deliveryLocation ? "border-orange-500 bg-orange-50" : ""}`}>
                    <SelectValue placeholder="납품처 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryLocations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 w-10 p-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>새 납품처 추가</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="납품처 이름"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const value = e.currentTarget.value.trim()
                            if (value) {
                              addDeliveryLocation(value)
                              setProjectSettings((prev) => ({ ...prev, hardware: { ...prev.hardware, deliveryLocation: value } }))
                              e.currentTarget.value = ""
                            }
                          }
                        }}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 실링재 공정 설정 섹션 */}
      <Card className="hover:shadow-md transition-shadow border-teal-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-900">실링재</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">납품희망일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`h-10 w-full justify-start text-left font-normal ${
                      projectSettings.sealing.deliveryDate ? "border-teal-500 bg-teal-50" : ""
                    }`}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {projectSettings.sealing.deliveryDate || "날짜 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={projectSettings.sealing.deliveryDate ? new Date(projectSettings.sealing.deliveryDate) : undefined}
                    onSelect={(date) =>
                      setProjectSettings((prev) => ({
                        ...prev,
                        sealing: { ...prev.sealing, deliveryDate: date?.toISOString().split("T")[0] || "" },
                      }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">거래처</Label>
              <Select
                value={projectSettings.sealing.supplier}
                onValueChange={(value) => setProjectSettings((prev) => ({ ...prev, sealing: { ...prev.sealing, supplier: value } }))}
              >
                <SelectTrigger className={`h-10 ${projectSettings.sealing.supplier ? "border-teal-500 bg-teal-50" : ""}`}>
                  <SelectValue placeholder="거래처 선택" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">납품처</Label>
              <Select
                value={projectSettings.sealing.deliveryLocation}
                onValueChange={(value) => setProjectSettings((prev) => ({ ...prev, sealing: { ...prev.sealing, deliveryLocation: value } }))}
              >
                <SelectTrigger className={`h-10 ${projectSettings.sealing.deliveryLocation ? "border-teal-500 bg-teal-50" : ""}`}>
                  <SelectValue placeholder="납품처 선택" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryLocations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 마감재 공정 설정 섹션 */}
      <Card className="hover:shadow-md transition-shadow border-indigo-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">마감재</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">납품희망일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`h-10 w-full justify-start text-left font-normal ${
                      projectSettings.finishing.deliveryDate ? "border-indigo-500 bg-indigo-50" : ""
                    }`}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {projectSettings.finishing.deliveryDate || "날짜 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={projectSettings.finishing.deliveryDate ? new Date(projectSettings.finishing.deliveryDate) : undefined}
                    onSelect={(date) =>
                      setProjectSettings((prev) => ({
                        ...prev,
                        finishing: { ...prev.finishing, deliveryDate: date?.toISOString().split("T")[0] || "" },
                      }))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">거래처</Label>
              <Select
                value={projectSettings.finishing.supplier}
                onValueChange={(value) => setProjectSettings((prev) => ({ ...prev, finishing: { ...prev.finishing, supplier: value } }))}
              >
                <SelectTrigger className={`h-10 ${projectSettings.finishing.supplier ? "border-indigo-500 bg-indigo-50" : ""}`}>
                  <SelectValue placeholder="거래처 선택" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">납품처</Label>
              <Select
                value={projectSettings.finishing.deliveryLocation}
                onValueChange={(value) => setProjectSettings((prev) => ({ ...prev, finishing: { ...prev.finishing, deliveryLocation: value } }))}
              >
                <SelectTrigger className={`h-10 ${projectSettings.finishing.deliveryLocation ? "border-indigo-500 bg-indigo-50" : ""}`}>
                  <SelectValue placeholder="납품처 선택" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryLocations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Excel 파일 업로드 섹션 */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Excel 파일 업로드</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">클릭하여 업로드</span> 또는 드래그 앤 드롭
                  </p>
                  <p className="text-xs text-gray-500">Excel 파일 (.xlsx, .xls)</p>
                </div>
                <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleUpload} />
              </label>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="text-sm text-gray-600">파일을 처리하고 있습니다...</div>
              </div>
            )}

            {fileName && (
              <div className="text-sm text-gray-600">
                업로드된 파일: <span className="font-medium">{fileName}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 스프레드시트 데이터 표시 */}
      {data.length > 0 && (
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">데이터 미리보기</h2>
            </div>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {data[0]?.map((_, colIndex) => (
                      <th key={colIndex} className="px-3 py-2 text-left font-medium text-gray-700 border-r">
                        {String.fromCharCode(65 + colIndex)}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-left font-medium text-gray-700">이미지</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 10).map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t">
                      {row.map((cell, colIndex) => (
                        <td key={colIndex} className="px-3 py-2 border-r">
                          {cell.displayValue || cell.value || ""}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <ImageUploadDialog
                          onImageUpload={(file) => {
                            setShapeImages((prev) => ({ ...prev, [rowIndex]: file }))
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length > 10 && (
                <div className="p-3 text-center text-sm text-gray-500 bg-gray-50">
                  ... 그 외 {data.length - 10}개 행
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 저장 및 다음 단계 버튼 */}
      <div className="flex justify-end gap-4">
        <Button
          onClick={handleSaveAndNext}
          className="flex items-center gap-2 px-6 bg-orange-600 hover:bg-orange-700"
          disabled={!projectSettings.siteName || !projectSettings.materialReceiver}
        >
          <ArrowRight className="h-4 w-4" />
          저장하고 다음 단계로
        </Button>
      </div>
    </div>
  )
}