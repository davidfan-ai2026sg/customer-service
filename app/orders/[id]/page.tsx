import { OrderDetail } from "@/components/OrderDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetail id={Number(id)} />;
}
