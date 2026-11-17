// A small stand-in for the Supabase query builder, covering the calls this app
// makes. It collects the query into a plain spec; an executor runs it (on the
// server directly, or from the browser through /api/demo/query).

export type Filter =
  | { op: 'eq'; col: string; val: unknown }
  | { op: 'in'; col: string; val: unknown[] }
  | { op: 'is'; col: string; val: unknown }
  | { op: 'not'; col: string; val: unknown }
  | { op: 'contains'; col: string; val: unknown[] };

export interface QuerySpec {
  table: string;
  action: 'select' | 'insert' | 'update' | 'upsert' | 'delete';
  payload?: unknown;
  filters: Filter[];
  orders: { col: string; asc: boolean }[];
  limit?: number;
  single?: 'one' | 'maybe';
  head?: boolean;
  /** insert/update followed by .select(): return the rows. */
  returning?: boolean;
}

export interface QueryResult {
  data: unknown;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

export type Executor = (spec: QuerySpec) => Promise<QueryResult>;

export class DemoQuery implements PromiseLike<QueryResult> {
  private spec: QuerySpec;
  constructor(
    table: string,
    private exec: Executor,
  ) {
    this.spec = { table, action: 'select', filters: [], orders: [] };
  }
  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.spec.action === 'select') {
      if (opts?.head) this.spec.head = true;
    } else {
      this.spec.returning = true;
    }
    return this;
  }
  insert(payload: unknown) {
    return this.write('insert', payload);
  }
  update(payload: unknown) {
    return this.write('update', payload);
  }
  upsert(payload: unknown) {
    return this.write('upsert', payload);
  }
  delete() {
    return this.write('delete');
  }
  eq(col: string, val: unknown) {
    this.spec.filters.push({ op: 'eq', col, val });
    return this;
  }
  in(col: string, val: unknown[]) {
    this.spec.filters.push({ op: 'in', col, val });
    return this;
  }
  is(col: string, val: unknown) {
    this.spec.filters.push({ op: 'is', col, val });
    return this;
  }
  not(col: string, _op: string, val: unknown) {
    this.spec.filters.push({ op: 'not', col, val });
    return this;
  }
  contains(col: string, val: unknown[]) {
    this.spec.filters.push({ op: 'contains', col, val });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.spec.orders.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  limit(n: number) {
    this.spec.limit = n;
    return this;
  }
  single() {
    this.spec.single = 'one';
    return this;
  }
  maybeSingle() {
    this.spec.single = 'maybe';
    return this;
  }
  then<A = QueryResult, B = never>(
    onfulfilled?: ((value: QueryResult) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return this.exec(this.spec).then(onfulfilled, onrejected);
  }
  private write(action: QuerySpec['action'], payload?: unknown) {
    this.spec.action = action;
    this.spec.payload = payload;
    return this;
  }
}
