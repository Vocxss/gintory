"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

type Notification = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};
type Payload = {
  success: boolean;
  message: string;
  data: Notification[];
  meta?: { unread_count: number };
};

async function api<T>(url: string, method = "GET"): Promise<T> {
  const response = await fetch(url, { method });
  const payload = (await response.json()) as Payload;
  if (!response.ok) throw new Error(payload.message);
  return payload as T;
}

export function NotificationManagement() {
  const queryClient = useQueryClient();
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<Payload>("/api/notifications"),
  });
  const markRead = useMutation({
    mutationFn: (id: string) => api(`/api/notifications/${id}/read`, "PATCH"),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Notifikasi</h1>
          <p className="text-sm text-muted-foreground">
            {notifications.data?.meta?.unread_count ?? 0} belum dibaca
          </p>
        </div>
        <Button variant="outline" onClick={() => markRead.mutate("all")}>
          Tandai Semua Dibaca
        </Button>
      </div>
      {notifications.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-3">
          {notifications.data?.data.length ? (
            notifications.data.data.map((notification) => (
              <Card key={notification.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>{notification.title}</CardTitle>
                    <Badge
                      variant={notification.is_read ? "secondary" : "default"}
                    >
                      {notification.is_read ? "Dibaca" : "Baru"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  <div>
                    <p>{notification.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {notification.link && (
                      <Button
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={notification.link} />}
                      >
                        Buka
                      </Button>
                    )}
                    {!notification.is_read && (
                      <Button
                        size="sm"
                        onClick={() => markRead.mutate(notification.id)}
                      >
                        Tandai Dibaca
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center text-muted-foreground">
              Tidak ada notifikasi
            </p>
          )}
        </div>
      )}
    </div>
  );
}
