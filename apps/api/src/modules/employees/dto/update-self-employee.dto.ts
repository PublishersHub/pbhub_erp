import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Self-service patch for the caller's own employee record.
 *
 * Intentionally narrow: only fields that are safe for any logged-in employee
 * (with `employee.read_own`) to mutate on themselves. Right now that's just
 * the profile photo — anything else (name, department, etc.) belongs to HR.
 */
export class UpdateSelfEmployeeDto {
  @ApiPropertyOptional({
    description:
      'Storage key (or legacy absolute URL) for the profile photo. Uploaded via /api/uploads with purpose=profile-photo.',
  })
  @IsOptional()
  @IsString()
  profileImageUrl?: string;
}
