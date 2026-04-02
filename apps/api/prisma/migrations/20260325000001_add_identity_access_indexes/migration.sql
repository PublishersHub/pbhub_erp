-- CreateIndex: roles (organization_id) for listing roles per org
CREATE INDEX "roles_organization_id_idx" ON "roles"("organization_id");

-- CreateIndex: user_roles (organization_id) for listing role assignments per org
CREATE INDEX "user_roles_organization_id_idx" ON "user_roles"("organization_id");
