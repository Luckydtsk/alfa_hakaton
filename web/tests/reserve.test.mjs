import test from 'node:test';
import assert from 'node:assert/strict';
import { applyIncome, applyPayment } from '../src/domain/models.ts';

const reserve = () => ({ active:true, limit:500000, ownFunds:80000, debt:0, events:[] });

test('payment uses own funds first and only borrows the shortfall', () => {
  const original=reserve();
  const result=applyPayment(original,120000,'Поставщик');
  assert.equal(result.ownFunds,0);
  assert.equal(result.debt,40000);
  assert.equal(result.limit-result.debt,460000);
  assert.equal(result.events[0].principal,40000);
  assert.equal(original.ownFunds,80000);
  assert.equal(original.events.length,0);
});

test('income repays debt first and restores the available limit', () => {
  const spent=applyPayment(reserve(),120000,'Поставщик');
  const partial=applyIncome(spent,15000);
  assert.equal(partial.debt,25000);
  assert.equal(partial.ownFunds,0);
  const result=applyIncome(spent,100000);
  assert.equal(result.debt,0);
  assert.equal(result.ownFunds,60000);
  assert.equal(result.limit-result.debt,500000);
  assert.equal(result.events[0].principal,40000);
});

test('exact balance does not use the reserve and exact available total is allowed', () => {
  assert.equal(applyPayment(reserve(),80000,'Счёт').debt,0);
  assert.equal(applyPayment(reserve(),580000,'Счёт').debt,500000);
  assert.throws(()=>applyPayment(reserve(),580001,'Счёт'),/недостаточно/);
});

test('inactive reserve and invalid monetary inputs are rejected', () => {
  assert.throws(()=>applyPayment({...reserve(),active:false},1,'Счёт'),/подключите/);
  for(const amount of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]) {
    assert.throws(()=>applyPayment(reserve(),amount,'Счёт'));
    assert.throws(()=>applyIncome(reserve(),amount));
  }
});
