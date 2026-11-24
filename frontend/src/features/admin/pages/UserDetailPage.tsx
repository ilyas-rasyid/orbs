import { usersApi } from "../services/users.api";
import { UserEditor } from "../components/UserEditor";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ActionError, Loading } from "../../../shared/components/ui";

export function UserDetailPage() {
  const { userId } = useParams({ from: "/_app/admin/users/$userId" });
  const user = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => usersApi.detail(userId),
  });
  return user.isPending ? (
    <Loading />
  ) : user.isError ? (
    <ActionError error={user.error} />
  ) : (
    <UserEditor
      key={user.data.version}
      user={user.data}
    />
  );
}
