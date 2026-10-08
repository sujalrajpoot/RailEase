export interface Train { id: number; number: string; name: string; source: string; destination: string; departure: string; arrival: string }
export type SeatState = "FREE" | "HELD" | "BOOKED";
export type SeatPosition = "WINDOW" | "AISLE";
export interface Seat { id: number; number: string; fare: number; state: SeatState; position: SeatPosition }
export interface HoldRequest { train_id: number; travel_date: string; cls: string; seat_ids: number[]; passengers: { name: string; email: string; phone: string }[] }
export interface HoldResponse { hold_id: string; expires_in: number; amount: number }
export interface HoldStatus { amount: number; ttl: number }
export interface PayResult { status: "SUCCESS" | "FAILED"; pnr?: string }
export interface Ticket { pnr: string; status: "CONFIRMED" | "CANCELLED"; train: string; from: string; to: string; departure: string; date: string; passengers: { name: string; seat: string }[]; seats: string[]; amount: number }
export interface CancelResult { pnr: string; status: string; refund: number; refund_percent: number }
