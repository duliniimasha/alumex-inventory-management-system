import clsx from 'clsx';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Check,
  Loader2,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getInventoryItems } from '../../api/inventory.api';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useOrderDetail } from '../../hooks/useOrderDetail';
import type { ProductCategory } from '../../types/inventory.types';
import type { AddOrderLineDto, OrderLine, UpdateOrderLineDto } from '../../types/sales.types';
import { formatNumber } from '../../utils/formatters';
import { getCategoryBadgeColor, getCategoryLabel } from '../../utils/inventory.utils';
import Badge from '../ui/Badge';
import ConfirmDialog from '../ui/ConfirmDialog';
import FormField from '../ui/FormField';

const addLineSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  qty_ordered: z.number().int().positive('Must be at least 1'),
  unit_price: z.number().positive('Price must be greater than 0'),
});

type AddLineValues = z.infer<typeof addLineSchema>;

interface ProductSelectOption {
  value: string;
  label: string;
  category: ProductCategory;
  unit: string;
}

interface OrderLineManagerProps {
  orderId: string;
  isEditable?: boolean;
  canEdit: boolean;
  productsForSelect: ProductSelectOption[];
}

type EditableField = 'qty_ordered' | 'unit_price';

type EditState = {
  lineId: string;
  field: EditableField;
  value: string;
};

const DEFAULT_ADD_VALUES: Partial<AddLineValues> = {
  product_id: '',
  qty_ordered: undefined,
  unit_price: undefined,
};

function formatCurrency(value: number): string {
  return `LKR ${formatNumber(value, 2)}`;
}

function getLineTotal(line: OrderLine): number {
  return line.qty_ordered * line.unit_price;
}

function getLineProductLabel(line: OrderLine): { sku: string; name: string } {
  const sku = line.product?.sku ?? 'SKU -';
  const name = line.product?.name ?? line.product_id;
  return { sku, name };
}

function getLineCategory(line: OrderLine): { label: string; color: 'green' | 'blue' | 'amber' | 'red' | 'gray' | 'purple' } {
  const category = line.product?.category;

  if (!category) {
    return { label: 'Unknown', color: 'gray' };
  }

  return {
    label: getCategoryLabel(category),
    color: getCategoryBadgeColor(category),
  };
}

export default function OrderLineManager({
  orderId,
  isEditable: isEditableOverride,
  canEdit,
  productsForSelect,
}: OrderLineManagerProps) {
  const {
    order,
    isLoading,
    error,
    isUpdating,
    orderTotal,
    totalItems,
    isDeleteConfirmOpen,
    isEditable,
    handleAddLine,
    handleUpdateLine,
    handleDeleteLine,
    confirmDeleteLine,
    cancelDeleteLine,
  } = useOrderDetail(orderId);

  const lines = order?.order_lines ?? [];
  const isOrderEditable = isEditableOverride ?? isEditable;
  const allowEdit = isOrderEditable && canEdit;

  const [editState, setEditState] = useState<EditState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const [productMenu, setProductMenu] = useState({ isOpen: false, search: '' });
  const productMenuRef = useRef<HTMLDivElement>(null);

  const [stockAvailable, setStockAvailable] = useState<number | null>(null);
  const [stockLoading, setStockLoading] = useState(false);

  useClickOutside(productMenuRef, () => setProductMenu((state) => ({ ...state, isOpen: false })));

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddLineValues>({
    resolver: zodResolver(addLineSchema),
    defaultValues: DEFAULT_ADD_VALUES,
  });

  const selectedProductId = watch('product_id');
  const qtyOrdered = watch('qty_ordered');

  const selectedProduct = useMemo(
    () => productsForSelect.find((product) => product.value === selectedProductId) ?? null,
    [productsForSelect, selectedProductId],
  );

  const filteredProducts = useMemo(() => {
    const query = productMenu.search.trim().toLowerCase();

    if (!query) {
      return productsForSelect;
    }

    return productsForSelect.filter((product) =>
      product.label.toLowerCase().includes(query),
    );
  }, [productMenu.search, productsForSelect]);

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    setProductMenu({ isOpen: false, search: selectedProduct.label });
  }, [selectedProduct]);

  useEffect(() => {
    if (!selectedProductId) {
      setStockAvailable(null);
      setStockLoading(false);
      return;
    }

    let isMounted = true;
    setStockLoading(true);

    const fetchStock = async () => {
      try {
        const response = await getInventoryItems({
          product_id: selectedProductId,
          page: 1,
          limit: 200,
        });

        if (!isMounted) {
          return;
        }

        const totalQty = response.data.reduce((sum, item) => sum + item.quantity, 0);
        setStockAvailable(totalQty);
      } catch {
        if (isMounted) {
          setStockAvailable(null);
        }
      } finally {
        if (isMounted) {
          setStockLoading(false);
        }
      }
    };

    void fetchStock();

    return () => {
      isMounted = false;
    };
  }, [selectedProductId]);

  const isStockLow =
    Number.isFinite(qtyOrdered) &&
    stockAvailable !== null &&
    stockAvailable <= Number(qtyOrdered);

  const startEdit = (line: OrderLine, field: EditableField) => {
    if (!allowEdit || isUpdating) {
      return;
    }

    const currentValue = field === 'qty_ordered'
      ? line.qty_ordered
      : line.unit_price;

    setEditState({
      lineId: line.id,
      field,
      value: Number.isFinite(currentValue) ? String(currentValue) : '',
    });
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditState(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editState) {
      return;
    }

    const parsedValue = Number(editState.value);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      setEditError('Enter a valid value');
      return;
    }

    const payload: UpdateOrderLineDto = editState.field === 'qty_ordered'
      ? { qty_ordered: parsedValue }
      : { unit_price: parsedValue };

    const didUpdate = await handleUpdateLine(editState.lineId, payload);

    if (didUpdate) {
      setEditState(null);
      setEditError(null);
    }
  };

  const onAddLineSubmit = async (values: AddLineValues) => {
    const payload: AddOrderLineDto = {
      product_id: values.product_id,
      qty_ordered: values.qty_ordered,
      unit_price: values.unit_price,
    };

    const didAdd = await handleAddLine(payload);

    if (didAdd) {
      reset(DEFAULT_ADD_VALUES);
      setProductMenu({ isOpen: false, search: '' });
      setStockAvailable(null);
    }
  };

  const renderEditableCell = (line: OrderLine, field: EditableField) => {
    const isEditing = editState?.lineId === line.id && editState?.field === field;
    const displayValue = field === 'qty_ordered'
      ? formatNumber(line.qty_ordered, 0)
      : formatNumber(line.unit_price, 2);

    if (!allowEdit) {
      return <span className="text-gray-900">{displayValue}</span>;
    }

    if (!isEditing) {
      return (
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
          onClick={() => startEdit(line, field)}
        >
          {displayValue}
        </button>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            type="number"
            step={field === 'unit_price' ? '0.01' : '1'}
            min={1}
            value={editState.value}
            onChange={(event) => {
              setEditState((prev) => (prev ? { ...prev, value: event.target.value } : prev));
              setEditError(null);
            }}
            className="h-8 w-24 rounded-lg border border-gray-300 px-2 text-sm text-gray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
            disabled={isUpdating}
          />
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 text-emerald-600 transition hover:bg-emerald-50"
            onClick={saveEdit}
            disabled={isUpdating}
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-100"
            onClick={cancelEdit}
            disabled={isUpdating}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {editError ? <span className="text-xs text-red-600">{editError}</span> : null}
      </div>
    );
  };

  return (
    <section className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Qty Ordered</th>
                <th className="px-4 py-3 font-semibold">Unit Price</th>
                <th className="px-4 py-3 font-semibold">Line Total</th>
                <th className="px-4 py-3 font-semibold">Dispatched</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <tr key={`order-line-skeleton-${index}`} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-4 py-4">
                        <div className="h-3 w-24 rounded bg-gray-200" />
                        <div className="mt-2 h-3 w-40 rounded bg-gray-100" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-6 w-20 rounded bg-gray-100" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-3 w-10 rounded bg-gray-200" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-3 w-16 rounded bg-gray-200" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-3 w-20 rounded bg-gray-200" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-3 w-10 rounded bg-gray-100" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-8 w-8 rounded bg-gray-100" />
                      </td>
                    </tr>
                  ))
                : null}

              {!isLoading && lines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <span className="rounded-full bg-gray-100 p-3">
                        <ShoppingCart className="h-6 w-6" />
                      </span>
                      <p className="text-sm font-semibold">No items added yet</p>
                      <p className="text-xs">Add your first line item above</p>
                    </div>
                  </td>
                </tr>
              ) : null}

              {!isLoading
                ? lines.map((line) => {
                    const productLabel = getLineProductLabel(line);
                    const category = getLineCategory(line);
                    const lineTotal = getLineTotal(line);
                    const canDelete = allowEdit && !isUpdating;

                    return (
                      <tr key={line.id} className="border-b border-gray-100 last:border-b-0">
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-gray-900">{productLabel.sku}</p>
                          <p className="text-xs text-gray-500">{productLabel.name}</p>
                        </td>
                        <td className="px-4 py-4">
                          <Badge label={category.label} color={category.color} />
                        </td>
                        <td className="px-4 py-4">
                          {renderEditableCell(line, 'qty_ordered')}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-400">LKR</span>
                            {renderEditableCell(line, 'unit_price')}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-semibold text-gray-800">
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="px-4 py-4 text-gray-500">
                          {formatNumber(line.qty_dispatched, 0)}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            className={clsx(
                              'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition',
                              canDelete && 'hover:border-red-200 hover:bg-red-50 hover:text-red-600',
                              !canDelete && 'cursor-not-allowed opacity-50',
                            )}
                            onClick={() => handleDeleteLine(line.id)}
                            disabled={!canDelete}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-6 border-t border-gray-100 bg-gray-50 px-5 py-3 text-sm text-gray-700">
          <div>
            <span className="font-semibold">Items:</span> {formatNumber(totalItems, 0)}
          </div>
          <div>
            <span className="font-semibold">Subtotal:</span> {formatCurrency(orderTotal)}
          </div>
          <div>
            <span className="font-semibold">Lines:</span> {lines.length}
          </div>
        </div>
      </div>

      {allowEdit ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800">Add Line Item</h3>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit(onAddLineSubmit)} noValidate>
            <FormField label="Product" required error={errors.product_id?.message}>
              <div ref={productMenuRef} className="relative">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={productMenu.search}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setProductMenu({ isOpen: true, search: nextValue });

                      if (selectedProductId) {
                        setValue('product_id', '', { shouldValidate: true });
                      }
                    }}
                    onFocus={() => setProductMenu((state) => ({ ...state, isOpen: true }))}
                    placeholder="Search and select product"
                    className="h-11 w-full rounded-lg border border-gray-300 pr-3 pl-10 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                    disabled={isUpdating}
                  />
                </div>

                <input type="hidden" {...register('product_id')} />

                {productMenu.isOpen ? (
                  <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                    {filteredProducts.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-500">No products found</p>
                    ) : (
                      filteredProducts.map((product) => (
                        <button
                          key={product.value}
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-amber-50"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setValue('product_id', product.value, { shouldValidate: true });
                            setProductMenu({ isOpen: false, search: product.label });
                          }}
                        >
                          {product.label}
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            </FormField>

            {selectedProduct ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    label={getCategoryLabel(selectedProduct.category)}
                    color={getCategoryBadgeColor(selectedProduct.category)}
                  />
                  <span className="text-xs text-gray-500">Unit: {selectedProduct.unit}</span>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {stockLoading
                    ? 'Loading stock...'
                    : stockAvailable !== null
                    ? `(Stock: ${formatNumber(stockAvailable, 0)} available)`
                    : '(Stock: unavailable)'}
                </p>
                {isStockLow ? (
                  <p className="mt-1 text-xs font-semibold text-red-600">Insufficient stock</p>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField label="Qty Ordered" required error={errors.qty_ordered?.message}>
                <input
                  type="number"
                  min={1}
                  placeholder="0"
                  className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                  {...register('qty_ordered', { valueAsNumber: true })}
                  disabled={isUpdating}
                />
              </FormField>

              <FormField label="Unit Price" required error={errors.unit_price?.message}>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">
                    LKR
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    className="h-11 w-full rounded-lg border border-gray-300 pl-12 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-400/50"
                    {...register('unit_price', { valueAsNumber: true })}
                    disabled={isUpdating}
                  />
                </div>
              </FormField>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add Line
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={cancelDeleteLine}
        onConfirm={confirmDeleteLine}
        title="Remove this line?"
        message="The reserved stock will be released."
        confirmLabel="Remove"
        variant="warning"
      />
    </section>
  );
}
