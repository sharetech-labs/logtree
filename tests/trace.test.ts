import { describe, it, expect } from 'vitest';
import { Trace } from '../src/index.js';

describe('Trace', () => {
  describe('constructor', () => {
    it('creates a root trace with id', () => {
      const trace = new Trace('order-123');
      const json = trace.toJSON();
      expect(json.id).toBe('order-123');
      expect(json.children).toEqual([]);
    });

    it('accepts optional root data', () => {
      const trace = new Trace('order-123', { customer: 'C-2041' });
      const json = trace.toJSON();
      expect(json.data).toEqual({ customer: 'C-2041' });
    });
  });

  describe('log', () => {
    it('adds children to the root', () => {
      const trace = new Trace('root');
      trace.log('step-a');
      trace.log('step-b');
      const json = trace.toJSON();
      expect(json.children).toHaveLength(2);
      expect(json.children[0]!.label).toBe('step-a');
      expect(json.children[1]!.label).toBe('step-b');
    });

    it('nests children under the returned context', () => {
      const trace = new Trace('root');
      const parent = trace.log('parent');
      parent.log('child');
      const json = trace.toJSON();
      expect(json.children).toHaveLength(1);
      expect(json.children[0]!.children).toHaveLength(1);
      expect(json.children[0]!.children[0]!.label).toBe('child');
    });

    it('attaches data to log entries', () => {
      const trace = new Trace('root');
      trace.log('pricing', { subtotal: 100 });
      const json = trace.toJSON();
      expect(json.children[0]!.data).toEqual({ subtotal: 100 });
    });

    it('tracks depth correctly', () => {
      const trace = new Trace('root');
      const a = trace.log('depth-1');
      const b = a.log('depth-2');
      b.log('depth-3');
      const json = trace.toJSON();
      expect(json.children[0]!._depth).toBe(1);
      expect(json.children[0]!.children[0]!._depth).toBe(2);
      expect(json.children[0]!.children[0]!.children[0]!._depth).toBe(3);
    });
  });

  describe('toJSON', () => {
    it('produces a serializable nested tree', () => {
      const trace = new Trace('order-123', { customer: 'C-2041' });
      const pricing = trace.log('pricing', { subtotal: 284.97 });
      pricing.log('apply-discount', { code: 'SAVE20' });
      trace.log('payment', { amount: 227.98 });

      const json = trace.toJSON();
      expect(json.id).toBe('order-123');
      expect(json.children).toHaveLength(2);
      expect(json.children[0]!.children).toHaveLength(1);
      expect(JSON.parse(JSON.stringify(json))).toEqual(json);
    });

    it('includes id and timestamp on every node', () => {
      const trace = new Trace('root');
      trace.log('step');
      const json = trace.toJSON();
      expect(json.timestamp).toBeDefined();
      expect(json.children[0]!.id).toBe(1);
      expect(json.children[0]!.timestamp).toBeDefined();
    });
  });

  describe('flat', () => {
    it('returns entries sorted by timestamp', () => {
      const trace = new Trace('root');
      const a = trace.log('a');
      a.log('a-child');
      trace.log('b');
      const flat = trace.flat();
      expect(flat).toHaveLength(3);
      expect(flat[0]!.label).toBe('a');
      expect(flat[2]!.label).toBe('b');
    });

    it('preserves depth in flat entries', () => {
      const trace = new Trace('root');
      const a = trace.log('a');
      a.log('a-child');
      const flat = trace.flat();
      expect(flat[0]!._depth).toBe(1);
      expect(flat[1]!._depth).toBe(2);
    });
  });

  describe('summary', () => {
    it('produces an ASCII tree', () => {
      const trace = new Trace('order-123');
      const pricing = trace.log('pricing', { subtotal: 284.97 });
      pricing.log('discount', { amount: 20 });
      trace.log('payment', { approved: true });

      const out = trace.summary();
      expect(out).toContain('order-123');
      expect(out).toContain('pricing');
      expect(out).toContain('discount');
      expect(out).toContain('payment');
      expect(out).toContain('├─');
      expect(out).toContain('└─');
    });
  });

  describe('mermaid', () => {
    it('produces a mermaid flowchart', () => {
      const trace = new Trace('order-123');
      trace.log('step-a');
      trace.log('step-b');
      const out = trace.mermaid();
      expect(out).toContain('graph TD');
      expect(out).toContain('root["order-123"]');
      expect(out).toContain('step-a');
      expect(out).toContain('step-b');
    });

    it('respects direction option', () => {
      const trace = new Trace('root');
      trace.log('a');
      expect(trace.mermaid({ direction: 'LR' })).toContain('graph LR');
    });

    it('adds order labels when enabled', () => {
      const trace = new Trace('root');
      trace.log('a');
      trace.log('b');
      const out = trace.mermaid({ order: true });
      expect(out).toContain('-->|1|');
      expect(out).toContain('-->|2|');
    });
  });
});
