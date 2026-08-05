import { CalendarClock, KeyRound, Settings as SettingsIcon, ShieldCheck, UserCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { RevealEmail } from "@/components/dashboard/RevealEmail";
import { formatDate } from "@/lib/utils";
import { updateName, changePassword, updateDateFormat } from "./actions";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  const user = await db.user.findUniqueOrThrow({
    where: { id: session!.user.id },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <SectionHeader
        icon={<SettingsIcon className="h-5 w-5" />}
        title="Settings"
        description="Find your profile information and settings."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <CardTitle className="mb-4 flex items-center gap-2 text-base">
              <UserCircle className="h-4 w-4 text-hyper-400" /> Profile
            </CardTitle>

            <div className="mb-5 space-y-4 border-b border-white/[0.06] pb-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-steel-faint">Email</p>
                <div className="mt-1">
                  <RevealEmail email={user.email} />
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-steel-faint">Member since</p>
                <p className="mt-1 text-sm text-white">{formatDate(user.createdAt)}</p>
              </div>
            </div>

            <form action={updateName} className="space-y-4">
              <div>
                <Label htmlFor="name">Display name</Label>
                <Input id="name" name="name" defaultValue={user.name} required />
              </div>
              <Button type="submit" size="sm" variant="secondary">
                Save profile
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle className="mb-4 flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-hyper-400" /> Change password
            </CardTitle>
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

        <Card>
          <CardBody>
            <CardTitle className="mb-4 flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-hyper-400" /> Date format
            </CardTitle>
            <p className="mb-4 text-sm text-steel-dim">
              How timestamps are shown across your dashboard, console, and backups.
            </p>
            <form action={updateDateFormat} className="flex flex-wrap items-end gap-2">
              <div className="min-w-[12rem] flex-1">
                <Label htmlFor="dateFormat">Format</Label>
                <Select id="dateFormat" name="dateFormat" defaultValue={user.dateFormat}>
                  <option value="iso">2026-08-05 17:50 (ISO)</option>
                  <option value="us">08/05/2026 5:50 PM (US)</option>
                  <option value="eu">05/08/2026 17:50 (EU)</option>
                </Select>
              </div>
              <Button type="submit" size="sm" variant="secondary">
                Save
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <CardTitle className="mb-4 flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-hyper-400" /> Security
            </CardTitle>
            <p className="text-sm text-steel-dim">
              Two-factor authentication and passkeys aren&apos;t available yet. Until then, use a
              unique password and keep your email account secure — password resets go there.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
