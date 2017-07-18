import expect from 'expect.js';
import sinon from 'sinon';
import requirefrom from 'requirefrom';
import Migration from '../../migration_12';
import Scenario1 from './scenarios/migration_12/scenario1';
import Scenario2 from './scenarios/migration_12/scenario2';
import url from 'url';
import { find } from 'lodash';

const serverConfig = requirefrom('test')('server_config');
const wrapAsync = requirefrom('src/test_utils')('wrap_async');
const indexSnapshot = requirefrom('src/test_utils')('index_snapshot');
const ScenarioManager = requirefrom('src/test_utils')('scenario_manager');
const { Cluster } = requirefrom('src/core_plugins/elasticsearch/lib')('cluster');

describe('kibi_core/migrations/functional', function () {

  const clusterUrl =  url.format(serverConfig.servers.elasticsearch);
  const timeout = 60000;
  this.timeout(timeout);

  const fakeConfig = {
    get: sinon.stub()
  };
  fakeConfig.get.withArgs('kibana.index').returns('.kibi');

  const scenarioManager = new ScenarioManager(clusterUrl, timeout);
  const cluster = new Cluster({
    url: clusterUrl,
    ssl: { verificationMode: 'none' },
    requestTimeout: timeout
  });

  async function snapshot() {
    return indexSnapshot(cluster, '.kibi');
  }

  describe('Migration 12 - Functional test', function () {
    let configuration;

    describe('should not update anything if kibi:defaultDashboardTitle already defined in Advanced Config', function () {

      beforeEach(wrapAsync(async () => {
        await scenarioManager.reload(Scenario2);
        configuration = {
          config: fakeConfig,
          client: cluster.getClient(),
          logger: {
            warning: sinon.spy(),
            info: sinon.spy()
          }
        };
      }));

      afterEach(wrapAsync(async () => {
        await scenarioManager.unload(Scenario2);
      }));

      it('should count all upgradeable objects', wrapAsync(async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(0);
      }));

    });

    describe('should not update anything if kibi_core.default_dashboard_title not defined in kibi.yml', function () {

      beforeEach(wrapAsync(async () => {
        await scenarioManager.reload(Scenario1);
        configuration = {
          config: fakeConfig,
          client: cluster.getClient(),
          logger: {
            warning: sinon.spy(),
            info: sinon.spy()
          }
        };
        fakeConfig.get.withArgs('kibi_core.default_dashboard_title').returns('');
      }));

      afterEach(wrapAsync(async () => {
        await scenarioManager.unload(Scenario1);
      }));

      it('should count all upgradeable objects', wrapAsync(async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(0);
      }));

    });

    describe('should update default dashboard title in Advanced Settings', function () {

      beforeEach(wrapAsync(async () => {
        await scenarioManager.reload(Scenario1);
        configuration = {
          config: fakeConfig,
          client: cluster.getClient(),
          logger: {
            warning: sinon.spy(),
            info: sinon.spy()
          }
        };
        fakeConfig.get.withArgs('kibi_core.default_dashboard_title').returns('Company');
      }));

      afterEach(wrapAsync(async () => {
        await scenarioManager.unload(Scenario1);
      }));

      it('should count all upgradeable objects', wrapAsync(async () => {
        const migration = new Migration(configuration);
        const result = await migration.count();
        expect(result).to.be(1);
      }));

      it('should upgrade all upgradeable objects', wrapAsync(async () => {
        const before = await snapshot();
        const migration = new Migration(configuration);

        const result = await migration.upgrade();
        expect(result).to.be(1);
        const after = await snapshot();

        for (const [id, original] of before) {
          const upgraded = after.get(id);

          if(original._type === 'config') {
            const originalDefaultDashboard = original._source['kibi:defaultDashboardTitle'];
            expect(originalDefaultDashboard).to.equal(undefined);
          }

          if(upgraded._type === 'config') {
            const upgradedDefaultDashboard = upgraded._source['kibi:defaultDashboardTitle'];
            expect(upgradedDefaultDashboard).to.equal('Test-Company');
          }
        }
      }));
    });
  });
});
