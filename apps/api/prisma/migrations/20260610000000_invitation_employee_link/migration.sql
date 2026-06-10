-- Add optional employee_id link on invitations so HR can invite an existing
-- employee directly and have the User auto-linked on accept.

ALTER TABLE "invitations" ADD COLUMN "employee_id" TEXT;

ALTER TABLE "invitations"
  ADD CONSTRAINT "invitations_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
