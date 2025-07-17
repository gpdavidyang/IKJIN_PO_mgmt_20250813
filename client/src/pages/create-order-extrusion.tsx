import React, { useState, useCallback, useEffect } from "react"
import * as XLSX from "xlsx"
import { useQuery } from "@tanstack/react-query"
import {
  Plus,
  Trash2,
  Upload,
  FileSpreadsheet,
  Building2,
  CalendarDays,
  ArrowRight,
  ArrowLeft,
  Save,
  FileText,
  Settings,
  Camera,
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
  extrusion: {
    deliveryDate: string
    supplier: string
    deliveryLocation: string
  }
  painting: {
    deliveryDate: string
    supplier: string
    deliveryLocation: string
  }
  insulation: {
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

// Simple formula evaluator
class FormulaEvaluator {
  private data: CellData[][]

  constructor(data: CellData[][]) {
    this.data = data
  }

  private getCellReference(ref: string): number {
    const match = ref.match(/^([A-Z]+)(\d+)$/)
    if (!match) return 0

    const col = this.columnToIndex(match[1])
    const row = Number.parseInt(match[2]) - 1

    if (row >= 0 && row < this.data.length && col >= 0 && col < (this.data[row]?.length || 0)) {
      const cellData = this.data[row][col]
      if (cellData) {
        const value = cellData.displayValue !== undefined ? cellData.displayValue : cellData.value
        const cleanValue = String(value).replace(/[,\s]/g, "")
        const numValue = Number.parseFloat(cleanValue)
        return isNaN(numValue) ? 0 : numValue
      }
    }
    return 0
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

    const cells = range.split(",").map((cell) => cell.trim().toUpperCase())
    return cells.reduce((sum, cell) => sum + this.getCellReference(cell), 0)
  }

  private sumRange(startRef: string, endRef: string): number {
    const startMatch = startRef.match(/^([A-Z]+)(\d+)$/)
    const endMatch = endRef.match(/^([A-Z]+)(\d+)$/)

    if (!startMatch || !endMatch) return 0

    const startCol = this.columnToIndex(startMatch[1])
    const startRow = Number.parseInt(startMatch[2]) - 1
    const endCol = this.columnToIndex(endMatch[1])
    const endRow = Number.parseInt(endMatch[2]) - 1

    let sum = 0
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        if (row >= 0 && row < this.data.length && col >= 0 && col < (this.data[row]?.length || 0)) {
          const cellData = this.data[row][col]
          if (cellData) {
            const value = cellData.displayValue !== undefined ? cellData.displayValue : cellData.value
            const cleanValue = String(value).replace(/[,\s]/g, "")
            const numValue = Number.parseFloat(cleanValue)
            if (!isNaN(numValue)) {
              sum += numValue
            }
          }
        }
      }
    }
    return sum
  }

  private evaluateArithmetic(formula: string): number {
    try {
      const sanitized = formula.replace(/[^0-9+\-*/().\s]/g, "")
      if (!sanitized.trim()) return 0
      return Function(`"use strict"; return (${sanitized})`)()
    } catch (error) {
      console.error("Arithmetic evaluation error:", error)
      return 0
    }
  }
}

const formatDate = (date: Date | string) => {
  if (typeof date === "string") {
    if (date === "협의") return "협의"
    return new Date(date).toLocaleDateString("ko-KR")
  }
  return date.toLocaleDateString("ko-KR")
}

function AddItemDialog({
  title,
  onAdd,
  trigger,
}: {
  title: string
  onAdd: (item: string) => void
  trigger: React.ReactNode
}) {
  const [newItem, setNewItem] = useState("")
  const [open, setOpen] = useState(false)

  const handleAdd = () => {
    if (newItem.trim()) {
      onAdd(newItem.trim())
      setNewItem("")
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title} 추가</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="newItem">새 {title}</Label>
            <Input
              id="newItem"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder={`${title}을 입력하세요`}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAdd}>추가</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function CreateExtrusionOrder() {
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
    extrusion: {
      deliveryDate: "",
      supplier: "",
      deliveryLocation: "",
    },
    painting: {
      deliveryDate: "",
      supplier: "",
      deliveryLocation: "",
    },
    insulation: {
      deliveryDate: "",
      supplier: "",
      deliveryLocation: "",
    },
  })

  // Fetch real data from APIs
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  })

  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
  })

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  })

  // Extract data for dropdowns with proper type handling
  const siteNames = Array.isArray(projects) ? projects.map((project: any) => project.name || project.projectName).filter(Boolean) : []
  const suppliers = Array.isArray(vendors) ? vendors.map((vendor: any) => vendor.companyName || vendor.name).filter(Boolean) : []
  const deliveryLocations = Array.isArray(vendors) ? vendors.map((vendor: any) => vendor.companyName || vendor.name).filter(Boolean) : []
  const materialReceivers = Array.isArray(users) ? users.map((user: any) => user.name).filter(Boolean) : []
  const headOfficeManagers = Array.isArray(users) ? users.map((user: any) => user.name).filter(Boolean) : []

  // State for managing local additions
  const [localSuppliers, setLocalSuppliers] = useState<string[]>([])
  const [localDeliveryLocations, setLocalDeliveryLocations] = useState<string[]>([])
  const [localMaterialReceivers, setLocalMaterialReceivers] = useState<string[]>([])
  const [localHeadOfficeManagers, setLocalHeadOfficeManagers] = useState<string[]>([])

  // Combined data arrays
  const allSuppliers = [...suppliers, ...localSuppliers]
  const allDeliveryLocations = [...deliveryLocations, ...localDeliveryLocations]
  const allMaterialReceivers = [...materialReceivers, ...localMaterialReceivers]
  const allHeadOfficeManagers = [...headOfficeManagers, ...localHeadOfficeManagers]

  const addSupplier = (newSupplier: string) => {
    setLocalSuppliers((prev) => [...prev, newSupplier])
  }

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
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">발주서 미리보기</h1>
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
          {/* 압출 정보 */}
          <Card className="border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-blue-700 text-sm">압출 공정</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-600">납품희망일</Label>
                  <p className="text-sm font-medium">{savedData.projectSettings.extrusion.deliveryDate}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">거래처</Label>
                  <p className="text-sm font-medium">{savedData.projectSettings.extrusion.supplier}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">납품처</Label>
                  <p className="text-sm font-medium">{savedData.projectSettings.extrusion.deliveryLocation}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 도장 정보 */}
          <Card className="border-green-200">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-700 text-sm">도장 공정</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-600">납품희망일</Label>
                  <p className="text-sm font-medium">{savedData.projectSettings.painting.deliveryDate}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">거래처</Label>
                  <p className="text-sm font-medium">{savedData.projectSettings.painting.supplier}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">납품처</Label>
                  <p className="text-sm font-medium">{savedData.projectSettings.painting.deliveryLocation}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 단열 정보 */}
          <Card className="border-orange-200">
            <CardHeader className="bg-orange-50">
              <CardTitle className="text-orange-700 text-sm">단열 공정</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-600">납품희망일</Label>
                  <p className="text-sm font-medium">{savedData.projectSettings.insulation.deliveryDate}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">거래처</Label>
                  <p className="text-sm font-medium">{savedData.projectSettings.insulation.supplier}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">납품처</Label>
                  <p className="text-sm font-medium">{savedData.projectSettings.insulation.deliveryLocation}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 스프레드시트 데이터 미리보기 */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
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
            className="flex items-center gap-2 px-8 bg-green-600 hover:bg-green-700"
            onClick={() => {
              // TODO: 실제 발주서 제출 로직 구현
              alert("발주서가 성공적으로 제출되었습니다!")
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
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">압출 발주서</h1>
          <p className="text-sm text-gray-600">압출 공정 전용 발주서를 작성하고 관리합니다.</p>
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
                <Label className="text-sm font-medium text-gray-700">프로젝트 명</Label>
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
                    <SelectTrigger className={`flex-1 h-10 ${projectSettings.materialReceiver ? "border-blue-500 bg-blue-50" : ""}`}>
                      <SelectValue placeholder="자재 인수자 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {allMaterialReceivers.map((receiver) => (
                        <SelectItem key={receiver} value={receiver}>
                          {receiver}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <AddItemDialog
                    title="자재 인수자"
                    onAdd={addMaterialReceiver}
                    trigger={
                      <Button variant="outline" size="sm" className="h-10 w-10 p-0">
                        <Plus className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">본사 담당자</Label>
                <div className="flex gap-2">
                  <Select
                    value={projectSettings.headOfficeManager}
                    onValueChange={(value) => setProjectSettings((prev) => ({ ...prev, headOfficeManager: value }))}
                  >
                    <SelectTrigger className={`flex-1 h-10 ${projectSettings.headOfficeManager ? "border-blue-500 bg-blue-50" : ""}`}>
                      <SelectValue placeholder="본사 담당자 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {allHeadOfficeManagers.map((manager) => (
                        <SelectItem key={manager} value={manager}>
                          {manager}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <AddItemDialog
                    title="본사 담당자"
                    onAdd={addHeadOfficeManager}
                    trigger={
                      <Button variant="outline" size="sm" className="h-10 w-10 p-0">
                        <Plus className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>

            {/* 공정별 설정 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 압출 섹션 */}
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  압출
                </h3>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-blue-700 font-medium">납품희망일</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 justify-start text-left font-normal h-8"
                          >
                            <CalendarDays className="mr-2 h-3 w-3" />
                            <span className="text-xs">
                              {projectSettings.extrusion.deliveryDate
                                ? formatDate(projectSettings.extrusion.deliveryDate)
                                : "날짜 선택"}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              projectSettings.extrusion.deliveryDate &&
                              projectSettings.extrusion.deliveryDate !== "협의"
                                ? new Date(projectSettings.extrusion.deliveryDate)
                                : undefined
                            }
                            onSelect={(date) => {
                              if (date) {
                                setProjectSettings((prev) => ({
                                  ...prev,
                                  extrusion: { ...prev.extrusion, deliveryDate: date.toISOString().split("T")[0] },
                                }))
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant={projectSettings.extrusion.deliveryDate === "협의" ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-8 px-2"
                        onClick={() =>
                          setProjectSettings((prev) => ({
                            ...prev,
                            extrusion: { ...prev.extrusion, deliveryDate: "협의" },
                          }))
                        }
                      >
                        협의
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-blue-700 font-medium">거래처명</Label>
                    <div className="flex gap-2">
                      <Select
                        value={projectSettings.extrusion.supplier}
                        onValueChange={(value) =>
                          setProjectSettings((prev) => ({
                            ...prev,
                            extrusion: { ...prev.extrusion, supplier: value },
                          }))
                        }
                      >
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue placeholder="거래처 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {allSuppliers.map((supplier) => (
                            <SelectItem key={supplier} value={supplier}>
                              {supplier}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <AddItemDialog
                        title="거래처"
                        onAdd={addSupplier}
                        trigger={
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                            <Plus className="h-3 w-3" />
                          </Button>
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-blue-700 font-medium">납품처</Label>
                    <div className="flex gap-2">
                      <Select
                        value={projectSettings.extrusion.deliveryLocation}
                        onValueChange={(value) =>
                          setProjectSettings((prev) => ({
                            ...prev,
                            extrusion: { ...prev.extrusion, deliveryLocation: value },
                          }))
                        }
                      >
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue placeholder="납품처 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {allDeliveryLocations.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <AddItemDialog
                        title="납품처"
                        onAdd={addDeliveryLocation}
                        trigger={
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                            <Plus className="h-3 w-3" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 도장 섹션 */}
              <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  도장
                </h3>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-green-700 font-medium">납품희망일</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 justify-start text-left font-normal h-8"
                          >
                            <CalendarDays className="mr-2 h-3 w-3" />
                            <span className="text-xs">
                              {projectSettings.painting.deliveryDate
                                ? formatDate(projectSettings.painting.deliveryDate)
                                : "날짜 선택"}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              projectSettings.painting.deliveryDate &&
                              projectSettings.painting.deliveryDate !== "협의"
                                ? new Date(projectSettings.painting.deliveryDate)
                                : undefined
                            }
                            onSelect={(date) => {
                              if (date) {
                                setProjectSettings((prev) => ({
                                  ...prev,
                                  painting: { ...prev.painting, deliveryDate: date.toISOString().split("T")[0] },
                                }))
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant={projectSettings.painting.deliveryDate === "협의" ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-8 px-2"
                        onClick={() =>
                          setProjectSettings((prev) => ({
                            ...prev,
                            painting: { ...prev.painting, deliveryDate: "협의" },
                          }))
                        }
                      >
                        협의
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-green-700 font-medium">거래처명</Label>
                    <div className="flex gap-2">
                      <Select
                        value={projectSettings.painting.supplier}
                        onValueChange={(value) =>
                          setProjectSettings((prev) => ({
                            ...prev,
                            painting: { ...prev.painting, supplier: value },
                          }))
                        }
                      >
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue placeholder="거래처 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {allSuppliers.map((supplier) => (
                            <SelectItem key={supplier} value={supplier}>
                              {supplier}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <AddItemDialog
                        title="거래처"
                        onAdd={addSupplier}
                        trigger={
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                            <Plus className="h-3 w-3" />
                          </Button>
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-green-700 font-medium">납품처</Label>
                    <div className="flex gap-2">
                      <Select
                        value={projectSettings.painting.deliveryLocation}
                        onValueChange={(value) =>
                          setProjectSettings((prev) => ({
                            ...prev,
                            painting: { ...prev.painting, deliveryLocation: value },
                          }))
                        }
                      >
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue placeholder="납품처 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {allDeliveryLocations.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <AddItemDialog
                        title="납품처"
                        onAdd={addDeliveryLocation}
                        trigger={
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                            <Plus className="h-3 w-3" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 단열 섹션 */}
              <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h3 className="font-semibold text-orange-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  단열
                </h3>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-orange-700 font-medium">납품희망일</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 justify-start text-left font-normal h-8"
                          >
                            <CalendarDays className="mr-2 h-3 w-3" />
                            <span className="text-xs">
                              {projectSettings.insulation.deliveryDate
                                ? formatDate(projectSettings.insulation.deliveryDate)
                                : "날짜 선택"}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              projectSettings.insulation.deliveryDate &&
                              projectSettings.insulation.deliveryDate !== "협의"
                                ? new Date(projectSettings.insulation.deliveryDate)
                                : undefined
                            }
                            onSelect={(date) => {
                              if (date) {
                                setProjectSettings((prev) => ({
                                  ...prev,
                                  insulation: { ...prev.insulation, deliveryDate: date.toISOString().split("T")[0] },
                                }))
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant={projectSettings.insulation.deliveryDate === "협의" ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-8 px-2"
                        onClick={() =>
                          setProjectSettings((prev) => ({
                            ...prev,
                            insulation: { ...prev.insulation, deliveryDate: "협의" },
                          }))
                        }
                      >
                        협의
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-orange-700 font-medium">거래처명</Label>
                    <div className="flex gap-2">
                      <Select
                        value={projectSettings.insulation.supplier}
                        onValueChange={(value) =>
                          setProjectSettings((prev) => ({
                            ...prev,
                            insulation: { ...prev.insulation, supplier: value },
                          }))
                        }
                      >
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue placeholder="거래처 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {allSuppliers.map((supplier) => (
                            <SelectItem key={supplier} value={supplier}>
                              {supplier}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <AddItemDialog
                        title="거래처"
                        onAdd={addSupplier}
                        trigger={
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                            <Plus className="h-3 w-3" />
                          </Button>
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-orange-700 font-medium">납품처</Label>
                    <div className="flex gap-2">
                      <Select
                        value={projectSettings.insulation.deliveryLocation}
                        onValueChange={(value) =>
                          setProjectSettings((prev) => ({
                            ...prev,
                            insulation: { ...prev.insulation, deliveryLocation: value },
                          }))
                        }
                      >
                        <SelectTrigger className="flex-1 h-8 text-xs">
                          <SelectValue placeholder="납품처 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {allDeliveryLocations.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <AddItemDialog
                        title="납품처"
                        onAdd={addDeliveryLocation}
                        trigger={
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                            <Plus className="h-3 w-3" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* 특이 사항 섹션 - UI Standards 적용 */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">특이 사항</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialNotes" className="text-sm font-medium text-gray-700">
              프로젝트 특이사항 및 요청사항
            </Label>
            <textarea
              id="specialNotes"
              value={projectSettings.specialNotes}
              onChange={(e) => setProjectSettings((prev) => ({ ...prev, specialNotes: e.target.value }))}
              placeholder="프로젝트 진행 시 고려해야 할 특이사항이나 요청사항을 입력해주세요..."
              className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              rows={4}
            />
            <p className="text-xs text-gray-500">
              예: 납품 시간 제한, 특별 포장 요구사항, 품질 기준, 설치 관련 주의사항 등
            </p>
          </div>
        </CardContent>
      </Card>
      {/* 파일 업로드 섹션 - UI Standards 적용 */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">엑셀 파일 업로드</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input 
                type="file" 
                accept=".xlsx,.xls" 
                onChange={handleUpload} 
                disabled={isLoading}
                className="h-10"
              />
              {fileName && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 font-medium">
                    업로드된 파일: {fileName}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFileName("")
                      setData([])
                      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
                      if (fileInput) {
                        fileInput.value = ""
                      }
                    }}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            {isLoading && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">파일을 처리하고 있습니다...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {data.length > 0 && (
        <>
          {/* 발주요약표 섹션 - UI Standards 적용 */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">발주요약표 (B1:E4)</h2>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <div className="overflow-auto">
                  <table className="w-full border-collapse">
                    <tbody>
                      {data.slice(0, 4).map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                          {Array.from({ length: 4 }, (_, colIndex) => {
                            const actualColIndex = colIndex + 1
                            const cell = row[actualColIndex]
                            let displayValue = cell?.displayValue !== undefined ? cell.displayValue : cell?.value

                            if (
                              displayValue === null ||
                              displayValue === undefined ||
                              displayValue === "" ||
                              displayValue === 0 ||
                              displayValue === "0"
                            ) {
                              displayValue = ""
                            } else {
                              if (typeof displayValue === "number" && !isNaN(displayValue)) {
                                displayValue = Number(displayValue).toFixed(1)
                              } else if (typeof displayValue === "string" && !isNaN(Number(displayValue))) {
                                const numValue = Number(displayValue)
                                if (numValue === 0) {
                                  displayValue = ""
                                } else {
                                  displayValue = numValue.toFixed(1)
                                }
                              }
                            }

                            return (
                              <td key={colIndex} className="border border-gray-300 p-2 text-center">
                                <span className="text-sm text-gray-900">{String(displayValue || "")}</span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 발주 품목 리스트 섹션 - UI Standards 적용 */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">발주 품목 리스트 (A6:I22)</h2>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <div className="overflow-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      <tr>
                        {["No", "품명", "Dies No", "색상", "길이", "단중", "중량", "비고", "기타"].map(
                          (header, index) => (
                            <th
                              key={index}
                              className="border border-gray-300 p-2 text-left font-semibold text-gray-700 bg-blue-50 text-xs"
                            >
                              {header}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(6, 22).map((row, rowIndex) => {
                        const actualRowIndex = rowIndex + 1
                        const isLastRow = actualRowIndex === 16
                        const itemName = row[1]?.displayValue || row[1]?.value || ""

                        if (!isLastRow && String(itemName).trim() === "") {
                          return null
                        }

                        return (
                          <tr
                            key={actualRowIndex}
                            className={`hover:bg-gray-50 transition-colors ${isLastRow ? "bg-yellow-100" : ""}`}
                          >
                            {Array.from({ length: 9 }, (_, colIndex) => {
                              const cell = row[colIndex]
                              let displayValue = cell?.displayValue !== undefined ? cell.displayValue : cell?.value

                              if (isLastRow && ((colIndex >= 1 && colIndex <= 6) || colIndex === 8)) {
                                displayValue = ""
                              } else {
                                if (
                                  displayValue === null ||
                                  displayValue === undefined ||
                                  displayValue === "" ||
                                  displayValue === 0 ||
                                  displayValue === "0"
                                ) {
                                  displayValue = ""
                                } else {
                                  if (colIndex === 0) {
                                    if (typeof displayValue === "number" && !isNaN(displayValue)) {
                                      displayValue = Math.round(displayValue).toString()
                                    } else if (typeof displayValue === "string" && !isNaN(Number(displayValue))) {
                                      const numValue = Number(displayValue)
                                      if (numValue === 0) {
                                        displayValue = ""
                                      } else {
                                        displayValue = Math.round(numValue).toString()
                                      }
                                    }
                                  } else {
                                    if (typeof displayValue === "number" && !isNaN(displayValue)) {
                                      displayValue = Number(displayValue).toFixed(1)
                                    } else if (typeof displayValue === "string" && !isNaN(Number(displayValue))) {
                                      const numValue = Number(displayValue)
                                      if (numValue === 0) {
                                        displayValue = ""
                                      } else {
                                        displayValue = numValue.toFixed(1)
                                      }
                                    }
                                  }
                                }
                              }

                              return (
                                <td
                                  key={colIndex}
                                  className={`border border-gray-300 p-2 text-center ${isLastRow ? "bg-yellow-100 font-semibold" : ""}`}
                                >
                                  <span className="text-xs text-gray-900">{String(displayValue || "")}</span>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 형상 이미지 업로드 섹션 - UI Standards 적용 */}
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">형상 이미지 업로드</h2>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  각 품목에 해당하는 형상 이미지를 업로드해주세요. (JPG, PNG, PDF 파일 지원)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.slice(6, 22).map((row, rowIndex) => {
                    const itemNo = row[0]?.displayValue || row[0]?.value || ""
                    const itemName = row[1]?.displayValue || row[1]?.value || ""
                    const isLastRow = rowIndex === 16

                    if (isLastRow || String(itemName).trim() === "") {
                      return null
                    }

                    return (
                      <div key={rowIndex} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              No. {typeof itemNo === "number" ? Math.round(itemNo) : itemNo || rowIndex + 1}
                            </Badge>
                          </div>
                          <h4 className="font-medium text-sm text-gray-900 truncate" title={String(itemName)}>
                            {String(itemName)}
                          </h4>
                        </div>

                        <div className="space-y-2">
                          <Input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null
                              if (file) {
                                setShapeImages((prev) => ({
                                  ...prev,
                                  [rowIndex]: file,
                                }))
                              }
                            }}
                            className="text-xs h-8"
                          />

                          {shapeImages[rowIndex] && (
                            <div className="flex items-center justify-between bg-green-50 p-2 rounded text-xs">
                              <span className="text-green-700 truncate">{shapeImages[rowIndex]?.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setShapeImages((prev) => {
                                    const updated = { ...prev }
                                    delete updated[rowIndex]
                                    return updated
                                  })
                                }}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      {data.length === 0 && (
        <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSpreadsheet className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 text-center mb-2 font-medium">
              엑셀 파일을 업로드하면 여기에 스프레드시트가 표시됩니다
            </p>
            <p className="text-sm text-gray-500 text-center">
              수식 지원: =A1+B1, =SUM(A1:A5), =B2*C2 등
            </p>
          </CardContent>
        </Card>
      )}
      {/* 저장 및 다음 단계 버튼 - UI Standards 적용 */}
      <div className="flex justify-center pt-6">
        <Button 
          onClick={handleSaveAndNext} 
          size="lg" 
          className="flex items-center gap-2 px-8 h-12 text-base font-medium"
          disabled={!fileName || data.length === 0}
        >
          <Save className="h-5 w-5" />
          저장하고 다음 단계로
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}