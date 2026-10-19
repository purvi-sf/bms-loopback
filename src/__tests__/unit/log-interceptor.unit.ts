import {InvocationContext} from '@loopback/core';
import {expect} from '@loopback/testlab';
import sinon from 'sinon';
import {LogInterceptor} from '../../interceptors/log.interceptor';

describe('LogInterceptor (unit)', () => {
  let interceptor: LogInterceptor;
  let invocationCtx: InvocationContext;
  let logStub: sinon.SinonStub;
  let next: sinon.SinonStub;
  const nextResult = {id: 1, title: 'Dune'};

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';
    interceptor = new LogInterceptor();
    invocationCtx = {
      targetName: 'BookController.prototype.create',
      methodName: 'create',
      args: [],
    } as unknown as InvocationContext;
    logStub = sinon.stub(console, 'log');
    next = sinon.stub().resolves(nextResult);
  });

  afterEach(() => {
    sinon.restore();
    delete process.env.JWT_SECRET;
  });

  it('value() returns an interceptor function', () => {
    expect(interceptor.value()).to.be.a.Function();
  });

  it('calls next() exactly once', async () => {
    await interceptor.value()(invocationCtx, next);
    expect(next.calledOnce).to.be.true();
  });

  it('returns the value returned by next()', async () => {
    const result = await interceptor.value()(invocationCtx, next);
    expect(result).to.equal(nextResult);
  });

  it('logs the method name before calling next()', async () => {
    await interceptor.value()(invocationCtx, next);
    const firstLog = logStub.getCall(0);
    expect(firstLog.args[0]).to.containEql('BookController.prototype.create');
    expect(firstLog.calledBefore(next.getCall(0))).to.be.true();
  });

  it('logs the duration in ms after next()', async () => {
    await interceptor.value()(invocationCtx, next);
    const durationLog = logStub
      .getCalls()
      .find(call => /completed in \d+ms/.test(String(call.args[0])));
    expect(durationLog).to.not.be.undefined();
    expect(durationLog!.calledAfter(next.getCall(0))).to.be.true();
  });
});
