export type UserRole = 'admin' | 'manager' | 'staff' | 'supplier';
export type SupplierStatus = 'Pending' | 'Approved' | 'Rejected';
export type RestockStatus = 'Pending' | 'Confirmed' | 'Rejected' | 'In Transit' | 'Received';
export type TransactionType = 'INCOMING' | 'OUTGOING';
export type TransactionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Shipped';

export type StockStatus = 'Out of Stock' | 'Severe' | 'Low' | 'Normal';

export interface IUserRow {
  id: string;
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  company_name: string | null;
  supplier_status: SupplierStatus | null;
  created_at: Date;
  updated_at: Date;
}

export interface ICategoryRow {
  id: string;
  name: string;
  description: string;
  image_url: string;
  created_at: Date;
  updated_at: Date;
}

export interface IProductRow {
  id: string;
  sku: string;
  name: string;
  category_id: string;
  description: string;
  buy_price: string;
  sell_price: string;
  min_stock: number;
  low_stock: number;
  current_stock: number;
  unit: string;
  rack_location: string;
  image_url: string;
  created_at: Date;
  updated_at: Date;
}

export interface IRestockOrderRow {
  id: string;
  po_number: string;
  supplier_id: string;
  created_by: string;
  order_date: Date;
  expected_delivery_date: Date;
  notes: string | null;
  status: RestockStatus;
  status_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface IRestockOrderItemRow {
  id: string;
  restock_order_id: string;
  product_id: string;
  quantity: number;
}

export interface ITransactionRow {
  id: string;
  transaction_number: string;
  type: TransactionType;
  transaction_date: Date;
  restock_order_id: string | null;
  supplier_id: string | null;
  customer_name: string | null;
  notes: string | null;
  status: TransactionStatus;
  rejection_reason: string | null;
  created_by: string;
  approved_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ITransactionItemRow {
  id: string;
  transaction_id: string;
  product_id: string;
  quantity: number;
}

export type SafeUser = Omit<IUserRow, 'password_hash'>;

export interface IProductWithDetails extends IProductRow {
  category_name: string;
  stock_status: StockStatus;
}

export interface IRestockOrderItemDetail extends IRestockOrderItemRow {
  product_sku: string;
  product_name: string;
  unit: string;
}

export interface IRestockOrderWithDetails extends IRestockOrderRow {
  supplier_name: string;
  supplier_company: string | null;
  created_by_name: string;
  items: IRestockOrderItemDetail[];
}

export interface ITransactionItemDetail extends ITransactionItemRow {
  product_sku: string;
  product_name: string;
  unit: string;
  current_stock: number;
}

export interface ITransactionWithDetails extends ITransactionRow {
  po_number: string | null;
  supplier_company: string | null;
  created_by_name: string;
  approved_by_name: string | null;
  items: ITransactionItemDetail[];
}

export interface ICreateProductInput {
  sku: string;
  name: string;
  category_id: string;
  description: string;
  buy_price: number;
  sell_price: number;
  min_stock: number;
  low_stock: number;
  current_stock: number;
  unit: string;
  rack_location: string;
  image_url: string;
}

export type UpdateProductInput = Omit<ICreateProductInput, 'sku'>;

export interface ICreateRestockOrderInput {
  supplier_id: string;
  order_date: string;
  expected_delivery_date: string;
  notes?: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
}

export interface ICreateIncomingTransactionInput {
  transaction_date: string;
  restock_order_id?: string | null;
  supplier_id: string;
  notes?: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
}

export interface ICreateOutgoingTransactionInput {
  transaction_date: string;
  customer_name: string;
  notes?: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
}