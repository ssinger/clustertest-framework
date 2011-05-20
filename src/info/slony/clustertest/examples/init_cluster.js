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
 
results.newGroup('example1');
var example1=new Example1(coordinator,results);
example1.initCluster();
example1.setupSlave();
var postgres1 = example1.startMaster();

var postgres2 = coordinator.createPostmaster("test2",example1.dataDirectorySlave);
postgres2.run();
coordinator.join(postgres2);
postgres1.stop();
coordinator.join(postgres1);