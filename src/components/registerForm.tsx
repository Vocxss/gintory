"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { Eye, EyeClosed } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { registerSchema } from "@/lib/validations/auth";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "./ui/input-group";
import { Spinner } from "./ui/spinner";
import { toast } from "./ui/toast";

export function RegisterForm({ ...props }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      company_name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok)
        toast.add({
          title: "Register gagal",
          description: result.message,
          type: "error",
        });
      else {
        toast.add({
          title: "Register berhasil",
          description: "Akun berhasil dibuat, silahkan login",
          type: "success",
        });
        setIsLoading(false);

        redirect("/login");
      }
    } catch (error) {
      console.error(error);
      toast.add({
        title: "Register gagal",
        description: error instanceof Error ? error.message : String(error),
        type: "error",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6")} {...props}>
      <Card>
        <CardHeader className={"flex flex-col justify-center items-center"}>
          <CardTitle>Selamat Datang di Gintory</CardTitle>
          <CardDescription>Buat akun supplier Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="full_name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="full_name">Nama Lengkap</FieldLabel>
                    <Input
                      {...field}
                      id="full_name"
                      type="text"
                      placeholder="Gibran Rakabuming Raka"
                      autoComplete="off"
                      required
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      {...field}
                      id="email"
                      type="text"
                      placeholder="gibranxgaming@gmail.com"
                      autoComplete="off"
                      required
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="company_name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor="company_name">
                      Nama Perusahaan
                    </FieldLabel>
                    <Input
                      {...field}
                      id="company_name"
                      type="text"
                      placeholder="PT. Gibran Rakabuming Raka"
                      autoComplete="off"
                      required
                    />
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
                      <InputGroupInput
                        {...field}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
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
                <Button disabled={isLoading ? true : false} type="submit">
                  {isLoading ? <Spinner /> : "Daftar"}
                </Button>
                <p className="text-sm text-center text-muted-foreground">
                  Sudah punya akun sebagai supplier?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Masuk disini
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
