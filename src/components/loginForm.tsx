"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { Eye, EyeClosed, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { loginSchema } from "@/lib/validations/auth";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "./ui/inputGroup";
import { Spinner } from "./ui/spinner";
import { toast } from "./ui/toast";

function getLoginErrorMessage(code?: string | null) {
  if (code === "SUPPLIER_PENDING") {
    return "Akun supplier Anda masih berstatus Pending dan menunggu verifikasi Admin.";
  }
  if (code?.startsWith("SUPPLIER_REJECTED:")) {
    const reason = decodeURIComponent(code.slice("SUPPLIER_REJECTED:".length));
    return `Akun supplier Anda ditolak Admin. Alasan: ${reason}`;
  }
  return "Email atau password tidak valid.";
}

export function LoginForm({ ...props }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    setErrorBanner(null);

    try {
      const res = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (!res || res.error || !res.ok) {
        const message = getLoginErrorMessage(res?.code);
        setErrorBanner(message);
        toast.add({
          title: "Login gagal",
          description: message,
          type: "error",
        });
      } else {
        toast.add({
          title: "Login berhasil",
          description: "Anda telah berhasil masuk ke Gintory",
          type: "success",
        });
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan saat login";
      setErrorBanner(message);
      toast.add({
        title: "Login gagal",
        description: message,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6")} {...props}>
      <Card>
        <CardHeader className="flex flex-col items-center justify-center">
          <CardTitle>Selamat Datang di Gintory</CardTitle>
          <CardDescription>Masukkan data login Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              {errorBanner && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {errorBanner}
                </div>
              )}
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <Mail />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id="email"
                        type="email"
                        placeholder="gibranxgaming@gmail.com"
                        autoComplete="email"
                        required
                      />
                    </InputGroup>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon align="inline-start">
                        <LockKeyhole />
                      </InputGroupAddon>
                      <InputGroupInput
                        {...field}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          type="button"
                          title="Show Password"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <Eye /> : <EyeClosed />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Field>
                <Button disabled={isLoading} type="submit">
                  {isLoading ? <Spinner /> : "Masuk"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Daftar sebagai supplier?{" "}
                  <Link
                    href="/register"
                    className="text-primary hover:underline"
                  >
                    Daftar disini
                  </Link>
                </p>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
