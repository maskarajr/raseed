import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  PackagePlusIcon,
  ClipboardListIcon,
  UsersIcon,
  SettingsIcon,
  ChevronRightIcon,
} from "lucide-react";

const actions = [
  {
    title: "New product",
    description: "Create a new SKU.",
    href: "/office/products?new=1",
    icon: <PackagePlusIcon aria-hidden="true" />,
  },
  {
    title: "Review submitted orders",
    description: "Orders waiting to confirm.",
    href: "/office/orders",
    icon: <ClipboardListIcon aria-hidden="true" />,
  },
  {
    title: "Customers",
    description: "Customer list and areas.",
    href: "/office/customers",
    icon: <UsersIcon aria-hidden="true" />,
  },
  {
    title: "Settings",
    description: "Office settings.",
    href: "/office/settings",
    icon: <SettingsIcon aria-hidden="true" />,
  },
] as const;

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick actions</CardTitle>
        <CardDescription>Shortcuts to same destinations.</CardDescription>
      </CardHeader>
      <CardContent>
        <ItemGroup className="gap-0">
          {actions.map((a) => (
            <Item
              key={a.title}
              render={<Link href={a.href} />}
              size="sm"
            >
              <ItemMedia variant="icon">{a.icon}</ItemMedia>
              <ItemContent>
                <ItemTitle>{a.title}</ItemTitle>
                <ItemDescription className="line-clamp-1">
                  {a.description}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <ChevronRightIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
