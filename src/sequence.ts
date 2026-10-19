import {inject} from '@loopback/core';
import {
  FindRoute,
  HttpErrors,
  InvokeMethod,
  ParseParams,
  Reject,
  RequestContext,
  RestBindings,
  Send,
  SequenceHandler,
} from '@loopback/rest';
import {
  AuthenticateFn,
  AuthenticationBindings,
} from 'loopback4-authentication';
import {
  AuthorizationBindings,
  AuthorizeFn,
} from 'loopback4-authorization';
import {AuthUser} from './providers/bearer-token-verify.provider';

const SequenceActions = RestBindings.SequenceActions;

export class MySequence implements SequenceHandler {
  constructor(
    @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
    @inject(SequenceActions.PARSE_PARAMS) protected parseParams: ParseParams,
    @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
    @inject(SequenceActions.SEND) public send: Send,
    @inject(SequenceActions.REJECT) public reject: Reject,
    @inject(AuthenticationBindings.USER_AUTH_ACTION)
    protected authenticateRequest: AuthenticateFn<AuthUser>,
    @inject(AuthorizationBindings.AUTHORIZE_ACTION)
    protected checkAuthorisation: AuthorizeFn,
  ) { }

  async handle(context: RequestContext) {
    try {
      const {request, response} = context;
      const route = this.findRoute(request);

      // Authenticate before parsing the body, so unauthenticated requests are
      // rejected with 401 without their payload being parsed or validated.
      // Runs BearerTokenVerifyProvider for @authenticate('bearer') routes
      // Returns null for public routes (not decorated with @authenticate)
      const authUser = await this.authenticateRequest(request, response);

      const args = await this.parseParams(request, route);

      // Runs @authorize decorator check using the user's permissions
      const isAllowed = await this.checkAuthorisation(
        authUser?.permissions ?? [],
        request,
      );

      if (!isAllowed) {
        // OWASP A01: proper 403 Forbidden for authorization failures
        throw new HttpErrors.Forbidden(
          'Access denied -- you do not have permission for this action',
        );
      }

      const result = await this.invoke(route, args);
      this.send(response, result);
    } catch (err) {
      this.reject(context, err);
    }
  }
}
