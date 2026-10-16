import type { Metadata } from "next";
import { connection } from "next/server";
import { todayKST } from "@/lib/quote";
import PatternDemo from "@/components/supplier/PatternDemo";
export const metadata:Metadata={title:"업체 도안 목업"};
async function deliveryDateForRequest(){
  await connection();
  return todayKST(new Date(Date.now()+14*86400000));
}
export default async function PatternPage(){
  const deliveryDate=await deliveryDateForRequest();
  return <PatternDemo deliveryDate={deliveryDate}/>;
}
