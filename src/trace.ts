// ── Types ──────────────────────────────────────────────

export interface TraceNodeJSON {
    label: string;
    data?: Record<string, unknown>;
    id: number;
    timestamp: string;
    _depth: number;
    children: TraceNodeJSON[];
}

export interface FlatEntry {
    label: string;
    data?: Record<string, unknown>;
    id: number;
    timestamp: string;
    _depth: number;
}

export interface TraceJSON {
    id: string;
    data?: Record<string, unknown>;
    timestamp: string;
    children: TraceNodeJSON[];
}

export interface MermaidOptions {
    /** Show execution order on edges with multiple children. Default: false */
    order?: boolean;
    /** Graph direction. Default: "TD" */
    direction?: 'TD' | 'LR' | 'BT' | 'RL';
}

// ── TraceContext ────────────────────────────────────────

export interface TraceContext {
    log(label: string, data?: Record<string, unknown>): TraceContext;
}

class TraceNode implements TraceContext {
    private id: number;
    private timestamp: string;
    private _depth: number;
    private label: string;
    private data?: Record<string, unknown>;
    private children: TraceNode[] = [];
    private _consoleLog: { enabled: boolean };
    private _counter: { next: number };

    constructor(
        label: string,
        depth: number,
        consoleLog: { enabled: boolean },
        counter: { next: number },
        data?: Record<string, unknown>
    ) {
        this.id = counter.next++;
        this.timestamp = new Date().toISOString();
        this._depth = depth;
        this.label = label;
        this.data = data;
        this._consoleLog = consoleLog;
        this._counter = counter;

        if (this._consoleLog.enabled) {
            const indent = '  '.repeat(depth);
            const dataStr = data ? ` ${JSON.stringify(data)}` : '';
            console.log(`${indent}${label}${dataStr}`);
        }
    }

    log(label: string, data?: Record<string, unknown>): TraceContext {
        const child = new TraceNode(label, this._depth + 1, this._consoleLog, this._counter, data);
        this.children.push(child);
        return child;
    }

    toJSON(): TraceNodeJSON {
        return {
            label: this.label,
            ...(this.data && { data: this.data }),
            id: this.id,
            timestamp: this.timestamp,
            _depth: this._depth,
            children: this.children.map((c) => c.toJSON()),
        };
    }

    summary(prefix = '', isLast = true): string {
        const connector = isLast ? '└─ ' : '├─ ';
        const dataStr = this.data
            ? ` (${Object.entries(this.data).map(([k, v]) => `${k}=${v}`).join(', ')})`
            : '';

        let line = `${prefix}${connector}${this.label}${dataStr}`;
        const childPrefix = prefix + (isLast ? '   ' : '│  ');

        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i]!;
            const last = i === this.children.length - 1;
            line += '\n' + child.summary(childPrefix, last);
        }

        return line;
    }

    /** @internal collect flat entries */
    _flat(entries: FlatEntry[]): void {
        entries.push({
            label: this.label,
            ...(this.data && { data: this.data }),
            id: this.id,
            timestamp: this.timestamp,
            _depth: this._depth,
        });
        for (const child of this.children) {
            child._flat(entries);
        }
    }

    /** @internal collect mermaid lines */
    _mermaid(lines: string[], parentId: string, opts: MermaidOptions, order?: number): void {
        const dataStr = this.data
            ? `\\n${Object.entries(this.data).map(([k, v]) => `${k}=${v}`).join(', ')}`
            : '';
        const nodeLabel = `${this.label}${dataStr}`;
        const safe = nodeLabel.replace(/"/g, '#quot;');

        const nodeId = `n${this.id}`;
        lines.push(`    ${nodeId}["${safe}"]`);
        const edge = opts.order && order !== undefined ? ` -->|${order}| ` : ' --> ';
        lines.push(`    ${parentId}${edge}${nodeId}`);

        const showOrder = opts.order && this.children.length > 1;
        for (let i = 0; i < this.children.length; i++) {
            this.children[i]!._mermaid(lines, nodeId, opts, showOrder ? i + 1 : undefined);
        }
    }

    mermaid(options?: MermaidOptions): string {
        const opts: MermaidOptions = {
            direction: 'TD',
            order: false,
            ...options,
        };
        const lines: string[] = [`graph ${opts.direction}`];
        const dataStr = this.data
            ? `\\n${Object.entries(this.data).map(([k, v]) => `${k}=${v}`).join(', ')}`
            : '';
        const nodeId = `n${this.id}`;
        const safe = `${this.label}${dataStr}`.replace(/"/g, '#quot;');
        lines.push(`    ${nodeId}["${safe}"]`);

        const showOrder = opts.order && this.children.length > 1;
        for (let i = 0; i < this.children.length; i++) {
            this.children[i]!._mermaid(lines, nodeId, opts, showOrder ? i + 1 : undefined);
        }

        return lines.join('\n');
    }
}

// ── Trace (root) ───────────────────────────────────────

export class Trace implements TraceContext {
    private id: string;
    private data?: Record<string, unknown>;
    private timestamp: string;
    private children: TraceNode[] = [];
    private _consoleLog = { enabled: false };
    private _counter = { next: 1 };

    constructor(id: string, data?: Record<string, unknown>) {
        this.id = id;
        this.data = data;
        this.timestamp = new Date().toISOString();
    }

    enableConsoleLogging(): this {
        this._consoleLog.enabled = true;
        return this;
    }

    disableConsoleLogging(): this {
        this._consoleLog.enabled = false;
        return this;
    }

    log(label: string, data?: Record<string, unknown>): TraceContext {
        const child = new TraceNode(label, 1, this._consoleLog, this._counter, data);
        this.children.push(child);
        return child;
    }

    toJSON(): TraceJSON {
        return {
            id: this.id,
            ...(this.data && { data: this.data }),
            timestamp: this.timestamp,
            children: this.children.map((c) => c.toJSON()),
        };
    }

    flat(): FlatEntry[] {
        const entries: FlatEntry[] = [];
        for (const child of this.children) {
            child._flat(entries);
        }
        return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }

    summary(): string {
        let out = this.id;
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i]!;
            const last = i === this.children.length - 1;
            out += '\n' + child.summary('', last);
        }
        return out;
    }

    mermaid(options?: MermaidOptions): string {
        const opts: MermaidOptions = {
            direction: 'TD',
            order: false,
            ...options,
        };
        const lines: string[] = [];
        lines.push(`graph ${opts.direction}`);

        const rootId = 'root';
        const dataStr = this.data
            ? `\\n${Object.entries(this.data).map(([k, v]) => `${k}=${v}`).join(', ')}`
            : '';
        const safe = `${this.id}${dataStr}`.replace(/"/g, '#quot;');
        lines.push(`    ${rootId}["${safe}"]`);

        const showOrder = opts.order && this.children.length > 1;
        for (let i = 0; i < this.children.length; i++) {
            this.children[i]!._mermaid(lines, rootId, opts, showOrder ? i + 1 : undefined);
        }

        return lines.join('\n');
    }
}
