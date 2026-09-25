import { redirect } from "next/navigation";

export default function InfrastructureIndex() {
  redirect("/settings/infrastructure/domains");
}
