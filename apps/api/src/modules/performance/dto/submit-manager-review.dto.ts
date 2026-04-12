import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ManagerReviewGoalDto {
  @ApiProperty()
  @IsUUID()
  goalId: string;

  @ApiPropertyOptional({ example: 4.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  managerRating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerComment?: string;
}

export class SubmitManagerReviewDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerComment?: string;

  @ApiPropertyOptional({ example: 3.5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  managerRating?: number;

  @ApiPropertyOptional({ type: [ManagerReviewGoalDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManagerReviewGoalDto)
  goalReviews?: ManagerReviewGoalDto[];

  @ApiProperty({ default: false })
  @IsBoolean()
  isDraft: boolean;
}
