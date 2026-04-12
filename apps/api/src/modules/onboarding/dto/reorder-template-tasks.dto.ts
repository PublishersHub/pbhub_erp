import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TemplateTaskOrderItem {
  @ApiProperty({ example: 'template-task-uuid' })
  @IsString()
  taskId: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderTemplateTasksDto {
  @ApiProperty({ type: [TemplateTaskOrderItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateTaskOrderItem)
  order: TemplateTaskOrderItem[];
}
