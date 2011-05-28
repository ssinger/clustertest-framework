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

/**
 * Create the the disorder tables and seed them with initial data.
 * The procedure for setting up/seeeding disorder is 
 *  1. run disorder-1.sql
 *  2. Invoke the poulate() function
 *  3. Run disorder-2.sql to setup fkey's etc...
 */
Example1.prototype.createTables=function() {
	var sql1 = this.coordinator.readFile('src/info/slony/clustertest/examples/disorder-1.sql');
	var psql1 = this.coordinator.createPsqlCommand("test1",sql1);
	psql1.run();
	this.coordinator.join(psql1);
	this.results.assertCheck('createTables - psql1 worked',0,psql1.getReturnCode());
	
	var seed=example1.seedData(10);
	this.coordinator.join(seed);
	results.assertCheck('seed finished okay',seed.getReturnCode(),0);
	
	var sql2 = this.coordinator.readFile('src/info/slony/clustertest/examples/disorder-2.sql');
	var psql2 = this.coordinator.createPsqlCommand("test1",sql2);
	psql2.run();
	this.coordinator.join(psql2);
	this.results.assertCheck('createTables - psql2 worked',0,psql2.getReturnCode());
	
}

/**
 * This function compares the contents of some disorder tables between two database
 * instances.
 */
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

/**
 * This tests the cancellation/conflict functionality with streaming rep.
 * We open up a transaction on the slave that accesses the do_inventory table.
 * We then run some load, which should alter the inventory table.
 * as this load is running we validate that the number of orders on the master
 * increases.  This shows that the load doesn't get stopped.
 * 
 * Then we verify that the transaction we started earlier was aborted/cancelled.
 *
 */
Example1.prototype.testOpenTxn=function()
{
	// Open a txn on the slave.
	// read the entire items table.
	// This should eventually stop the slave from updating since it can't
	// apply rows.
	//
	var load = this.generateLoad('test1');
	
	var slaveCon = this.coordinator.createJdbcConnection('test2');
	slaveCon.setAutoCommit(false);
	var slaveStat = slaveCon.createStatement();
	var rs = slaveStat.executeQuery("select * FROM disorder.do_inventory");
	
	/**
	 * for 5 minutes check every 10 seconds that the number of orders are the master
	 * is increasing.
	 */
	 var iterations=5*6;
	 var idx=0;
	 var masterCon = this.coordinator.createJdbcConnection('test1');
	 var masterStat = masterCon.createStatement();
	 var lastCount=0;
	 while(idx < iterations) {
	 	java.lang.Thread.sleep(10*1000);
	 	var countRS=masterStat.executeQuery("select count(*) FROM disorder.do_order");
	 	countRS.next();
	 	var count=countRS.getInt(1);
	 	this.results.assertCheck('count is increasing', count>lastCount,true);
	 	lastCount=count;
	 	countRS.close();
	 	masterStat.execute("vacuum disorder.do_inventory");
	 	idx++;
	 }
	 //
	 // At this point we expect the slave to have been cancelled.
	 try {
		rs.close();
		rs = slaveStat.executeQuery("select count(*) FROM disorder.do_inventory");
		while(rs.next()) {
			var i = rs.getInt(1);
		}
		this.results.assertCheck("exception caught as expected",true,false);
		rs.close();	 
	 }
	 catch(e) {
	 	this.results.assertCheck("exception caught as expected",true,true);
	 	rs.close();
	 }
	 masterStat.close();
	 slaveStat.close();
	 masterCon.close();
	 slaveCon.close();
	 load.stop();
	 this.coordinator.join(load);
}


//
// The test script starts here.
 
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

//We generate some load in the background.
var load = example1.generateLoad('test1');
java.lang.Thread.sleep(60*1000);

//Stop the load.
load.stop();
this.coordinator.join(load);

//We wait for the standby to be caught up
//synchronous replication does not actually mean
//that the data is visible on the slave when the
//data has committed on the master.
example1.sync('test2');
example1.compareDb('test1','test2');

example1.testOpenTxn();

postgres2.stop();
coordinator.join(postgres2);
postgres1.stop();

