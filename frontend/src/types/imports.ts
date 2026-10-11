export const FIELDS = [
  "customer_id",
  "email",
  "country",
  "signup_date",
  "order_amount",
  "currency",
  "payment_method",
  "order_status",
  "product_category",
  "quantity",
  "discount_percent",
  "last_login_date",
] as const;
export type FieldRule = {
  required?: boolean;
  allowed_values?: string[];
  minimum?: number | null;
  maximum?: number | null;
  date_format?: string | null;
};
export type ImportOptions = {
  mapping: Record<string, string>;
  rules: Record<string, FieldRule>;
  template_id?: number | null;
  template_version?: number | null;
};
export type ImportTemplate = {
  id: number;
  name: string;
  version: number;
  options: ImportOptions;
};
export type Issue = { fields: string[]; category: string; message: string };
export type DatasetRecord = {
  row_number: number;
  status: "accepted" | "rejected";
  values: Record<string, string>;
  normalized: Record<string, string>;
  issues: Issue[];
};
export type RecordPage = {
  records: DatasetRecord[];
  total: number;
  page: number;
  page_size: number;
  fields: string[];
};
export type ImportPreview = {
  headers: string[];
  required_fields: string[];
  suggested_mapping: Record<string, string>;
  rows: {
    row_number: number;
    values: Record<string, string>;
    issues: Issue[];
  }[];
  sample_limit: number;
};
export const fieldLabel = (key: string) => key.replace(/_/g, " ");
