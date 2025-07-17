import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { insertItemSchema } from "@shared/schema";
import type { Item, InsertItem } from "@shared/schema";
import { z } from "zod";

const itemFormSchema = insertItemSchema.extend({
  standardPrice: z.string().optional().transform((val) => val && val !== "" ? val : undefined)
});

type ItemFormData = z.infer<typeof itemFormSchema>;

interface ItemFormProps {
  item?: Item | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ItemForm({ item, onSuccess, onCancel }: ItemFormProps) {
  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: item?.name || "",
      category: item?.category || "",
      specification: item?.specification || "",
      unit: item?.unit || "",
      standardPrice: item?.standardPrice || undefined,
      description: item?.description || "",
      isActive: item?.isActive ?? true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ItemFormData) => {
      const payload: InsertItem = {
        ...data,
        standardPrice: data.standardPrice || null
      };
      return await apiRequest("POST", "/api/items", payload);
    },
    onSuccess,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ItemFormData) => {
      const payload: Partial<InsertItem> = {
        ...data,
        standardPrice: data.standardPrice || null
      };
      const response = await fetch(`/api/items/${item!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to update item');
      return response.json();
    },
    onSuccess,
  });

  const onSubmit = (data: ItemFormData) => {
    if (item) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const categories = ["원자재", "부품", "소모품", "장비", "기타"];
  const units = ["개", "박스", "세트", "kg", "g", "L", "mL", "m", "cm", "mm", "㎡", "㎥", "시간", "일"];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>품목명 *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="품목명을 입력하세요" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>카테고리</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="카테고리를 선택하세요" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>단위 *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="단위를 선택하세요" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="standardPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>표준단가</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="specification"
          render={({ field }) => (
            <FormItem>
              <FormLabel>규격</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ""}
                  placeholder="품목의 상세 규격을 입력하세요"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>설명</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ""}
                  placeholder="품목에 대한 추가 설명을 입력하세요"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">활성 상태</FormLabel>
                <div className="text-sm text-muted-foreground">
                  품목을 활성화하여 발주에서 사용할 수 있도록 합니다
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            취소
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {item ? "수정 중..." : "생성 중..."}
              </>
            ) : (
              item ? "수정" : "생성"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}