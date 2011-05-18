/**
 * This example file can be launched as follows.
 *
 * you might want to edit the properties file (init_cluster.properties) first.
 * 
 * java -jar clustertest-coordinator.jar src/info/slony/clustertest/examples/init_cluster.js src/info/slony/clustertest/examples/init_cluster.properties)
 *
 * coordinator and properties are global variables passed into the context by clustertest 
 */
 
 results.newGroup('example1');
var initcluster = coordinator.createInitDatabase("test1");
initcluster.run();
coordinator.join(initcluster);
var retCode = initcluster.getReturnCode();
var dataDirectory = initcluster.getDataDirectory();

results.assertCheck('initdb returned okay',retCode,0); 
var confFileTransform = new Packages.info.slony.clustertest.testcoordinator.pgsql.ConfFileTransform("test1",
		new java.io.File(dataDirectory,"postgresql.conf"),properties);
confFileTransform.setPort();		
confFileTransform.rewriteConfFile();

// create a db.
var copyArray=["cp","-r", dataDirectory.getAbsolutePath(),dataDirectory.getAbsolutePath()+".slave"];
var copyProcess=java.lang.Runtime.getRuntime().exec(copyArray);
copyProcess.waitFor();
var postgres1 = coordinator.createPostmaster("test1",dataDirectory);
postgres1.run();

var dataDirectorySlave = new java.io.File(dataDirectory.getAbsolutePath()+".slave");
var slaveConfFileTransform =new Packages.info.slony.clustertest.testcoordinator.pgsql.ConfFileTransform("test2",
		new java.io.File(dataDirectorySlave,"postgresql.conf"),properties); 
slaveConfFileTransform.setPort();
slaveConfFileTransform.rewriteConfFile();
var postgres2 = coordinator.createPostmaster("test2",dataDirectorySlave);
postgres2.run();
coordinator.join(postgres2);