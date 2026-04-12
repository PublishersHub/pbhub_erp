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

export class SelfReviewGoalDto {
  @ApiProperty()
  @IsUUID()
  goalId: string;

  @ApiPropertyOptional({ example: 4.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  selfRating?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  selfComment?: string;
}

export class SubmitSelfReviewDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  selfComment?: string;

  @ApiPropertyOptional({ example: 3.5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(5)
  selfRating?: number;

  @ApiPropertyOptional({ type: [SelfReviewGoalDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelfReviewGoalDto)
  goalReviews?: SelfReviewGoalDto[];

  @ApiProperty({ default: false })
  @IsBoolean()
  isDraft: boolean;
}
