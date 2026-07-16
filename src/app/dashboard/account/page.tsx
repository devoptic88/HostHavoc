import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { updateName, changePassword } from "./actions";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  const user = await db.user.findUniqueOrThrow({
    where: { id: session!.user.id },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-extrabold italic text-white">
        Your <span className="text-gradient-hyper">account</span>
      </h1>

      <Card>
        <CardBody>
          <CardTitle className="mb-4 text-base">Profile</CardTitle>
          <form action={updateName} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={user.name} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user.email} disabled />
            </div>
            <Button type="submit" size="sm" variant="secondary">
              Save profile
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <CardTitle className="mb-4 text-base">Change password</CardTitle>
          <form action={changePassword} className="space-y-4">
            <div>
              <Label htmlFor="current">Current password</Label>
              <Input id="current" name="current" type="password" required autoComplete="current-password" />
            </div>
            <div>
              <Label htmlFor="next">New password</Label>
              <Input id="next" name="next" type="password" required minLength={8} autoComplete="new-password" />
            </div>
            <Button type="submit" size="sm" variant="secondary">
              Update password
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
