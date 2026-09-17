/* Execute repository edge-function bodies with local I/O doubles, not a Deno deployment. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const root = path.resolve(process.argv[2] || '.');
const ts = require(path.join(root, 'node_modules/typescript'));
const observed = {};

function load(config = {}) {
  const calls = [], http = [];
  const position = { id: 'position-1', book_id: 'book-1', instrument: 'BTC-USD', side: 'buy', size: 10, entry_price: 80, mark_price: 100, realized_pnl: 0 };
  const db = { from(table) {
    const call = { table, operation: 'select', filters: [] };
    const chain = {};
    for (const method of ['select', 'insert', 'update', 'eq', 'in', 'limit', 'single']) {
      chain[method] = (...args) => {
        if (['insert', 'update'].includes(method)) { call.operation = method; call.payload = args[0]; }
        if (method === 'select') call.columns = args[0];
        if (['eq', 'in'].includes(method)) call.filters.push([method, ...args]);
        return chain;
      };
    }
    chain.then = (resolve, reject) => {
      calls.push(call);
      let data = null, error = null;
      if (call.operation === 'select') {
        if (table === 'user_roles') data = [{role: 'trader'}];
        if (table === 'system_health') data = config.health || ['oms', 'risk_engine', 'database'].map(component => ({component, status:'healthy'}));
        if (table === 'global_settings') {
          data = {id:'settings-1', global_kill_switch:false, reduce_only_mode:false, paper_trading_mode: config.paper !== false};
          if (config.settingsError) { data = null; error = {message:'fixture settings read failed'}; }
        }
        if (table === 'books') data = {status:'active', capital_allocated:100000, current_exposure:0};
        if (table === 'risk_limits') data = null;
        if (table === 'venues') data = {id:'venue-1',status:'healthy',is_enabled:true};
        if (table === 'positions') data = config.existingPosition ? position : null;
      } else {
        data = table === 'orders' && call.operation === 'insert' ? {id:'order-1'} : null;
        if (config.writeErrors && !(table === 'orders' && call.operation === 'insert')) error = {code:'fixture',message:'fixture write failed'};
      }
      return Promise.resolve({data,error}).then(resolve,reject);
    };
    return chain;
  }};
  let handler;
  const math = Object.create(Math);
  math.random = () => config.halfFill ? 0 : 0.5;
  const sandbox = {
    console: {log(){},error(){},warn(){}}, Request, Response, TextEncoder, URLSearchParams,
    crypto: webcrypto, Math: math,
    setTimeout: (callback) => { callback(); return 1; },
    Deno: {env:{get: key => ({SUPABASE_URL:'http://audit.invalid', SUPABASE_SERVICE_ROLE_KEY:'fixture', COINBASE_API_KEY:'fixture', COINBASE_API_SECRET:'fixture'})[key]}},
    createClient: () => db, serve: fn => {handler = fn;}, getSecureCorsHeaders: () => ({}),
    validateAuth: async () => ({user:{id:'user-1',email:'audit@example.invalid'}}), rateLimitMiddleware: () => null, RATE_LIMITS:{trading:30},
    fetch: async (url, options = {}) => {
      http.push({url:String(url),method:options.method || 'GET',body:options.body ? JSON.parse(options.body) : undefined});
      if (String(url).includes('binance.com')) return new Response(JSON.stringify({price:'100'}));
      if (String(url).includes('coinbase.com')) {
        if (config.uncertainSubmit) throw new Error('fixture response lost after venue acceptance');
        return new Response(JSON.stringify({success:true,success_response:{order_id:'venue-ack-1'}}));
      }
      throw new Error('Unexpected mock URL');
    },
  };
  const filename = path.join(root,'supabase/functions/live-trading/index.ts');
  const source = ts.createSourceFile(filename, fs.readFileSync(filename,'utf8'), ts.ScriptTarget.Latest, true);
  const statements = source.statements.filter(statement => !ts.isImportDeclaration(statement));
  const stripped = ts.createPrinter().printFile(ts.factory.updateSourceFile(source, statements));
  const code = ts.transpileModule(stripped + '\nglobalThis.audit = {runSafetyChecks, executeCoinbaseOrder, executeOnVenue};', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  const context = vm.createContext(sandbox);
  vm.runInContext(code, context, {filename, timeout:10000});
  return {handler, db, calls, http, api:context.audit};
}
const order = {bookId:'book-1',instrument:'BTC-USD',side:'buy',size:2,orderType:'market',venue:'coinbase'};
async function request(test, body) {
  const response = await test.handler(new Request('http://audit.invalid/live-trading',{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify(body)}));
  return {status:response.status,body:await response.json()};
}
(async () => {
  let test = load({settingsError:true});
  const safety = await test.api.runSafetyChecks(test.db, order);
  assert.equal(safety.passed,true);
  observed.settings_read_error_passes_safety = {passed:safety.passed};
  const placed = await request(test,{action:'place_order',order});
  assert.equal(placed.body.mode,'live');
  observed.missing_paper_mode_defaults_to_live = {status:placed.status,mode:placed.body.mode,mock_venue_submissions:test.http.filter(call=>call.method==='POST').length};

  test = load({health:[{component:'oms',status:'unhealthy'}]});
  const unhealthy = await test.api.runSafetyChecks(test.db,order);
  assert.equal(unhealthy.passed,true);
  observed.missing_health_rows_override_known_unhealthy = {known_oms_status:'unhealthy',passed:unhealthy.passed};

  test = load({paper:false,existingPosition:true,halfFill:true});
  const closed = await request(test,{action:'close_position',positionId:'position-1',percentage:100});
  const closeUpdate = test.calls.find(call=>call.table==='positions' && call.operation==='update');
  assert.equal(closed.body.success,true);
  assert.equal(test.http.filter(call=>call.method==='POST').length,0);
  assert.equal(closeUpdate.payload.size,0);
  observed.live_position_close_only_simulates_and_overstates_fill = {reported_closed_size:closed.body.closedSize,simulated_filled_size:5,db_is_open:closeUpdate.payload.is_open,venue_submissions:0};

  test = load({paper:false});
  const cancelled = await request(test,{action:'cancel_order',orderId:'order-1'});
  assert.equal(cancelled.body.success,true);
  assert.equal(test.http.length,0);
  observed.cancel_order_only_updates_database = {success:true,venue_requests:0};

  test = load({paper:false});
  const ack = await test.api.executeCoinbaseOrder(order);
  assert.equal(ack.filledSize,2);
  assert.equal(ack.filledPrice,0);
  observed.coinbase_acknowledgement_becomes_zero_price_full_fill = {venue_response:'success_response.order_id only',filled_size:ack.filledSize,filled_price:ack.filledPrice};

  test = load({writeErrors:true});
  const corrupt = await request(test,{action:'place_order',order:{...order,price:100}});
  assert.equal(corrupt.body.success,true);
  observed.post_execution_writes_fail_but_response_succeeds = {status:corrupt.status,success:corrupt.body.success,failed_write_targets:test.calls.filter(call=>['insert','update'].includes(call.operation) && !(call.table==='orders' && call.operation==='insert')).map(call=>call.table)};

  test = load({paper:false,uncertainSubmit:true});
  await test.api.executeOnVenue(order);
  const submissions = test.http.filter(call=>call.method==='POST');
  const ids = submissions.map(call=>call.body.client_order_id);
  assert.equal(ids.length,3);
  assert.equal(new Set(ids).size,3);
  observed.uncertain_submission_retried_with_new_client_ids = {submission_attempts:ids.length,unique_client_order_ids:new Set(ids).size};

  const apiCalls = [];
  const apiSource = fs.readFileSync(path.join(root,'src/lib/apiClient.ts'),'utf8').replaceAll('import.meta.env','globalThis.__audit_env');
  const apiCode = ts.transpileModule(apiSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const apiContext = vm.createContext({exports:{},__audit_env:{},fetch:async (url,options)=>{apiCalls.push({url,headers:options.headers});return new Response('{}');}});
  vm.runInContext(apiCode,apiContext);
  await apiContext.exports.arbitrageApi.getStatus();
  assert.equal(apiCalls[0].url,'http://localhost:8000/api/arbitrage/status');
  assert.equal(apiCalls[0].headers.Authorization,undefined);
  observed.frontend_api_client_uses_incompatible_default_route_and_no_session = {requested_url:apiCalls[0].url,authorization_header_present:false,backend_composed_path:'/api/v1/api/arbitrage/status'};

  console.log(JSON.stringify({source:'e603ddd7bb908d24321a640ba1ac646e5b043600',probe_count:Object.keys(observed).length,observed},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
