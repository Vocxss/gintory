import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";

export const KPICard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) => {
  return (
    <Card className="flex-row gap-2 items-center justify-start p-4">
      <span className="size-4 text-primary">{icon}</span>
      <CardHeader className="w-full flex flex-col items-start justify-start gap-1">
        <CardTitle className="w-full text-sm">{title}</CardTitle>
        <CardDescription className=" text-lg text-secondary">
          {value}
        </CardDescription>
      </CardHeader>
    </Card>
  );
};
