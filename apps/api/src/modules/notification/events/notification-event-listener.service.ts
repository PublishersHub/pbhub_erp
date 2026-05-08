import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationDispatcherService } from '../services/notification-dispatcher.service';
import {
  NotificationEventPayload,
  NotificationEvents,
} from './event-types';

/**
 * Listens for cross-module events and forwards them to the dispatcher.
 * Keeps the dispatch logic decoupled from domain services.
 */
@Injectable()
export class NotificationEventListenerService {
  private readonly logger = new Logger(NotificationEventListenerService.name);

  constructor(private readonly dispatcher: NotificationDispatcherService) {}

  // ─── Leave events ───────────────────────

  @OnEvent(NotificationEvents.LEAVE_SUBMITTED)
  async onLeaveSubmitted(payload: NotificationEventPayload) {
    await this.dispatcher.dispatch(NotificationEvents.LEAVE_SUBMITTED, payload);
  }

  @OnEvent(NotificationEvents.LEAVE_APPROVED)
  async onLeaveApproved(payload: NotificationEventPayload) {
    await this.dispatcher.dispatch(NotificationEvents.LEAVE_APPROVED, payload);
  }

  @OnEvent(NotificationEvents.LEAVE_REJECTED)
  async onLeaveRejected(payload: NotificationEventPayload) {
    await this.dispatcher.dispatch(NotificationEvents.LEAVE_REJECTED, payload);
  }

  @OnEvent(NotificationEvents.LEAVE_CANCELLED)
  async onLeaveCancelled(payload: NotificationEventPayload) {
    await this.dispatcher.dispatch(NotificationEvents.LEAVE_CANCELLED, payload);
  }

  // ─── Expense events ─────────────────────

  @OnEvent(NotificationEvents.EXPENSE_SUBMITTED)
  async onExpenseSubmitted(payload: NotificationEventPayload) {
    await this.dispatcher.dispatch(NotificationEvents.EXPENSE_SUBMITTED, payload);
  }

  @OnEvent(NotificationEvents.EXPENSE_MANAGER_APPROVED)
  async onExpenseManagerApproved(payload: NotificationEventPayload) {
    await this.dispatcher.dispatch(
      NotificationEvents.EXPENSE_MANAGER_APPROVED,
      payload,
    );
  }

  @OnEvent(NotificationEvents.EXPENSE_FINANCE_APPROVED)
  async onExpenseFinanceApproved(payload: NotificationEventPayload) {
    await this.dispatcher.dispatch(
      NotificationEvents.EXPENSE_FINANCE_APPROVED,
      payload,
    );
  }

  @OnEvent(NotificationEvents.EXPENSE_REJECTED)
  async onExpenseRejected(payload: NotificationEventPayload) {
    await this.dispatcher.dispatch(NotificationEvents.EXPENSE_REJECTED, payload);
  }

  @OnEvent(NotificationEvents.EXPENSE_REIMBURSED)
  async onExpenseReimbursed(payload: NotificationEventPayload) {
    await this.dispatcher.dispatch(
      NotificationEvents.EXPENSE_REIMBURSED,
      payload,
    );
  }

  @OnEvent(NotificationEvents.EXPENSE_CANCELLED)
  async onExpenseCancelled(payload: NotificationEventPayload) {
    await this.dispatcher.dispatch(
      NotificationEvents.EXPENSE_CANCELLED,
      payload,
    );
  }

  // ─── Payroll events ─────────────────────

  @OnEvent(NotificationEvents.PAYROLL_CYCLE_FINALIZED)
  async onPayrollCycleFinalized(payload: NotificationEventPayload) {
    await this.dispatcher.dispatch(
      NotificationEvents.PAYROLL_CYCLE_FINALIZED,
      payload,
    );
  }

  // ─── Performance events ─────────────────

  @OnEvent(NotificationEvents.PERFORMANCE_CYCLE_STATUS_CHANGED)
  async onPerformanceCycleStatusChanged(payload: NotificationEventPayload) {
    await this.dispatcher.dispatch(
      NotificationEvents.PERFORMANCE_CYCLE_STATUS_CHANGED,
      payload,
    );
  }

  @OnEvent(NotificationEvents.PERFORMANCE_GOAL_APPROVED)
  async onPerformanceGoalApproved(payload: NotificationEventPayload) {
    await this.dispatcher.dispatch(
      NotificationEvents.PERFORMANCE_GOAL_APPROVED,
      payload,
    );
  }

  @OnEvent(NotificationEvents.PERFORMANCE_GOAL_REJECTED)
  async onPerformanceGoalRejected(payload: NotificationEventPayload) {
    await this.dispatcher.dispatch(
      NotificationEvents.PERFORMANCE_GOAL_REJECTED,
      payload,
    );
  }

  @OnEvent(NotificationEvents.PERFORMANCE_REVIEW_COMPLETED)
  async onPerformanceReviewCompleted(payload: NotificationEventPayload) {
    await this.dispatcher.dispatch(
      NotificationEvents.PERFORMANCE_REVIEW_COMPLETED,
      payload,
    );
  }

  // ─── Attendance events ──────────────────

  @OnEvent(NotificationEvents.ATTENDANCE_CORRECTION_SUBMITTED)
  async onAttendanceCorrectionSubmitted(payload: NotificationEventPayload) {
    await this.dispatcher.dispatch(
      NotificationEvents.ATTENDANCE_CORRECTION_SUBMITTED,
      payload,
    );
  }

  @OnEvent(NotificationEvents.ATTENDANCE_CORRECTION_DECIDED)
  async onAttendanceCorrectionDecided(payload: NotificationEventPayload) {
    await this.dispatcher.dispatch(
      NotificationEvents.ATTENDANCE_CORRECTION_DECIDED,
      payload,
    );
  }

  // ─── Suggestion events ──────────────────

  @OnEvent(NotificationEvents.SUGGESTION_RESPONDED)
  async onSuggestionResponded(payload: NotificationEventPayload) {
    await this.dispatcher.dispatch(
      NotificationEvents.SUGGESTION_RESPONDED,
      payload,
    );
  }
}
