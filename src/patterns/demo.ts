import {demoRepository} from './architecture/repository';
import {demoChainOfResponsibility} from './behavioral/chain-of-responsibility';
import {demoCommand} from './behavioral/command';
import {demoMediator} from './behavioral/mediator';
import {demoObserver} from './behavioral/observer';
import {demoStrategy} from './behavioral/strategy';
import {demoTemplateMethod} from './behavioral/template-method';
import {demoAbstractFactory} from './creational/abstract-factory';
import {demoBuilder} from './creational/builder';
import {demoFactory} from './creational/factory';
import {demoPrototype} from './creational/prototype';
import {demoSingleton} from './creational/singleton';
import {DemoLogger} from './shared/bms-types';
import {demoAdapter} from './structural/adapter';
import {demoBridge} from './structural/bridge';
import {demoComposite} from './structural/composite';
import {demoDecorator} from './structural/decorator';
import {demoFacade} from './structural/facade';

export const PATTERN_DEMOS: Array<
  [name: string, run: (log: DemoLogger) => void | Promise<void>]
> = [
  ['1. Singleton', demoSingleton],
  ['2. Factory', demoFactory],
  ['3. Builder', demoBuilder],
  ['4. Prototype', demoPrototype],
  ['5. Abstract Factory', demoAbstractFactory],
  ['6. Adapter', demoAdapter],
  ['7. Decorator', demoDecorator],
  ['8. Composite', demoComposite],
  ['9. Facade', demoFacade],
  ['10. Bridge', demoBridge],
  ['11. Observer', demoObserver],
  ['12. Strategy', demoStrategy],
  ['13. Command', demoCommand],
  ['14. Mediator', demoMediator],
  ['15. Chain of Responsibility', demoChainOfResponsibility],
  ['16. Template Method', demoTemplateMethod],
  ['17. Repository', demoRepository],
];

export async function runAllPatternDemos(
  log: DemoLogger = console.log,
): Promise<void> {
  for (const [name, run] of PATTERN_DEMOS) {
    log(`\n=== ${name} ${'='.repeat(Math.max(0, 50 - name.length))}`);
    await run(log);
  }
}

if (require.main === module) {
  runAllPatternDemos().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
