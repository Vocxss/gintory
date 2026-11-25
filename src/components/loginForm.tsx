"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { Eye, EyeClosed, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
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

type LoginBanner = {
  tone: "warning" | "error";
  message: string;
};

function getLoginErrorBanner(code?: string | null): LoginBanner {
  if (code === "SUPPLIER_PENDING") {
    return {
      tone: "warning",
      message:
        "Akun supplier Anda masih berstatus Pending dan menunggu verifikasi Admin.",
    };
  }
  if (code?.startsWith("SUPPLIER_REJECTED:")) {
    const reason = decodeURIComponent(code.slice("SUPPLIER_REJECTED:".length));
    return {
      tone: "error",
      message: `Akun supplier Anda ditolak Admin. Alasan: ${reason}`,
    };
  }
  return {
    tone: "error",
    message: "Email atau password tidak valid.",
  };
}

export function LoginForm({ ...props }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorBanner, setErrorBanner] = useState<LoginBanner | null>(null);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code === "SUPPLIER_PENDING" || code?.startsWith("SUPPLIER_REJECTED:")) {
      setErrorBanner(getLoginErrorBanner(code));
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (
      code === "SUPPLIER_PENDING" ||
      code?.startsWith("SUPPLIER_REJECTED:")
    ) {
      setErrorBanner(getLoginErrorBanner(code));
    }
  }, []);

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
      const checkResponse = await fetch("/api/auth/login-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });
      const checkPayload = (await checkResponse.json()) as {
        success: boolean;
        message: string;
        errors?: { code?: string };
      };

      if (!checkResponse.ok) {
        const tone =
          checkPayload.errors?.code === "SUPPLIER_PENDING"
            ? "warning"
            : "error";
        const message =
          checkPayload.message || "Email atau password tidak valid.";
        setErrorBanner({ tone, message });
        toast.add({
          title:
            tone === "warning" ? "Menunggu verifikasi Admin" : "Login gagal",
          description: message,
          type: "error",
        });
        return;
      }

      const res = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (!res || res.error || !res.ok) {
        const banner = getLoginErrorBanner(res?.code);
        setErrorBanner(banner);
        toast.add({
          title: "Login gagal",
          description: banner.message,
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
      setErrorBanner({ tone: "error", message });
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
                <div
                  role="alert"
                  className={cn(
                    "rounded-md border p-3 text-sm",
                    errorBanner.tone === "warning"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : "border-destructive/40 bg-destructive/10 text-destructive",
                  )}
                >
                  {errorBanner.message}
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
