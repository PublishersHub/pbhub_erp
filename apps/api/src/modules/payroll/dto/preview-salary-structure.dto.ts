import {
  IsArray,
  IsNumber,
  IsUUID,
  Min,
  ArrayNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PreviewSalaryStructureDto {
  @ApiProperty({ example: 1200000, description: 'Cost to company (annual or monthly — your call; same currency as components).' })
  @IsNumber()
  @Min(0)
  ctc: number;

  @ApiProperty({ type: [String], description: 'Salary component IDs to include in the preview.' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  componentIds: string[];
}
