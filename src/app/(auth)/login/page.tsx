"use client";
import { LoginForm } from "@/components/loginForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scrollArea";
import Image from "next/image";
import { useState } from "react";

const demoAccounts = [
  {
    email: "admin_gibran@gintory.id",
    password: "gibran19",
    role: "admin",
  },
  {
    email: "manager_bahlulu@gintory.id",
    password: "bahlulu02",
    role: "manager",
  },
  {
    email: "staff_bahlili@gintory.id",
    password: "bahlili02",
    role: "staff",
  },
  {
    email: "supply_cabowo@fantech.id",
    password: "hidup_sawit",
    role: "supplier",
  },
];

export default function LoginPage() {
  const [showDemoAccount, setShowDemoAccount] = useState(false);

  return (
    <div className="flex min-h-svh items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <Button
        className={"fixed top-4 right-4"}
        onClick={() => setShowDemoAccount(!showDemoAccount)}
      >
        {showDemoAccount ? "Sembunyikan" : "Tampilkan"} Akun Demo
      </Button>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center font-bold text-2xl">
          <Image
            loading="eager"
            src={"/logotypo.webp"}
            alt="Logo"
            width={800}
            height={800}
            className="w-48  object-cover"
          />
        </div>
        <LoginForm />
      </div>
      {showDemoAccount && (
        <Card>
          <CardHeader>
            <p className="text-center">Daftar akun demo</p>
          </CardHeader>
          <CardContent>
            <ScrollArea className={"max-h-64 rounded"}>
              {demoAccounts.map((account) => (
                <div
                  key={account.email}
                  className="grid grid-cols-2 gap-4 first:mb-4 my-4 last:mt-4"
                >
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-blue-600">{account.role}</p>
                    <p>{account.email}</p>
                  </div>
                  <p className="flex justify-end items-center">
                    {account.password}
                  </p>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
