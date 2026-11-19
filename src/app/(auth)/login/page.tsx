import { LoginForm } from "@/components/loginForm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import Image from "next/image";

const demoAccounts = [
  {
    email: "gibranxgaming@xyz.com",
    password: "gibran123",
    role: "admin",
  },
  {
    email: "abcd@gmail.com",
    password: "12345678",
    role: "supplier",
  },
];

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
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
      <Card>
        <CardHeader>
          <p className="text-center">Daftar akun demo</p>
        </CardHeader>
        <CardContent>
          <ScrollArea className={"max-h-64 rounded"}>
            {demoAccounts.map((account) => (
              <div key={account.email} className="grid grid-cols-2 gap-4 first:mb-4 my-4 last:mt-4">
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-blue-600">{account.role}</p>
                  <p>{account.email}</p>
                </div>
                <p className="flex justify-end items-center">{account.password}</p>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
