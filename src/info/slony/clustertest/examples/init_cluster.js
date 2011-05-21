/**
 * This example file can be launched as follows.
 *
 * you might want to edit the properties file (init_cluster.properties) first.
 * 
 * java -jar clustertest-coordinator.jar src/info/slony/clustertest/examples/init_cluster.js src/info/slony/clustertest/examples/init_cluster.properties)
 *
 * coordinator and properties are global variables passed into the context by clustertest 
 */
coordinator.includeFile('src/info/slony/clustertest/examples/StreamingRepBase.js');

Example1=function(coordinator,results) {
	StreamingRepBase.call(this,coordinator,results);
	
} 

Example1.prototype=new StreamingRepBase();
Example1.prototype.constructor=Example1;

Example1.prototype.createTables=function() {
	var sql1 = this.coordinator.readFile('src/info/slony/clustertest/examples/disorder-1.sql');
	var psql1 = this.coordinator.createPsqlCommand("test1",sql1);
	psql1.run();
	this.coordinator.join(psql1);
	this.results.assertCheck('createTables - psql1 worked',0,psql1.getReturnCode());
	var sql2 = this.coordinator.readFile('src/info/slony/clustertest/examples/disorder-2.sql');
	var psql2 = this.coordinator.createPsqlCommand("test1",sql2);
	psql2.run();
	this.coordinator.join(psql2);
	this.results.assertCheck('createTables - psql2 worked',0,psql2.getReturnCode());
	
}

Example1.prototype.compareDb=function(lhs_db, rhs_db) {
	//Compare the results.
    this.coordinator.log("BasicTest.prototype.compareDb ["+lhs_db + ","+rhs_db + "] - begin");
	var queryList = [
	                 ['SELECT c_id,c_name,c_total_orders,c_total_value FROM disorder.do_customer order by c_id','c_id']
	                 ,['SELECT i_id,i_name,i_price,i_in_production FROM disorder.do_item order by i_id','i_id']
	                 ,['SELECT ii_id, ii_in_stock,ii_reserved,ii_total_sold FROM disorder.do_inventory order by ii_id','ii_id']
	                 ];
	
	compareFinished = {
			onEvent : function(object, event) {			
					compResult=object.getResultCode();
					results.assertCheck("history is equal for " + lhs_db + " vs " + rhs_db,compResult,Packages.info.slony.clustertest.testcoordinator.CompareOperation.COMPARE_EQUALS)
					coordinator.stopProcessing();
					coordinator.removeObserver(object,event,this);
									
					
			}
		};


	
	for(var idx=0; idx < queryList.length; idx++) {
		var compareOp = this.coordinator.createCompareOperation(lhs_db,rhs_db,queryList[idx][0],
				queryList[idx][1]);
		this.coordinator.registerObserver(compareOp, Packages.info.slony.clustertest.testcoordinator.Coordinator.EVENT_FINISHED,
				new Packages.info.slony.clustertest.testcoordinator.script.ExecutionObserver(compareFinished));

		compareOp.run();
		//At some point all the compare could be done concurrently?
		this.coordinator.join(compareOp);
	}
        this.coordinator.log("BasicTest.prototype.compareDb ["+lhs_db + ","+rhs_db + "] - complete");
}

 
results.newGroup('example1');
var example1=new Example1(coordinator,results);
example1.initCluster();

example1.setupSlave();
var postgres1 = example1.startMaster();
java.lang.Thread.sleep(10*1000);
var postgres2 = coordinator.createPostmaster("test2",example1.dataDirectorySlave);
postgres2.run();
java.lang.Thread.sleep(10*1000);
example1.setupDb();
example1.createTables();

//We wait for the standby to be caught up
//synchronous replication does not actually mean
//that the data is visible on the slave when the
//data has committed on the master.
java.lang.Thread.sleep(10*1000);
example1.compareDb('test1','test2');

coordinator.join(postgres2);
postgres1.stop();

