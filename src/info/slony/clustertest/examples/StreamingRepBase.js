function StreamingRepBase(coordinator,results) {
	this.coordinator=coordinator;
	this.results=results;

}

/**
 * Initialize a single postgresql database cluster (data directory).
 * The configuration files will be configured for hot standby operation.
 * 
 */
StreamingRepBase.prototype.initCluster=function() {
	var initcluster = this.coordinator.createInitDatabase("test1");
	initcluster.run();
	this.coordinator.log("Waiting for initdb to finish");
	this.coordinator.join(initcluster);
	this.coordinator.log("initdb has finished");
	var retCode = initcluster.getReturnCode();
	this.dataDirectory = initcluster.getDataDirectory();

	this.results.assertCheck('initdb returned okay',retCode,0); 

	this.archiveDirectory=new java.io.File(this.dataDirectory,"archive");
	this.archiveDirectory.mkdir();

	var confFileTransform = new Packages.info.slony.clustertest.testcoordinator.pgsql.ConfFileTransform("test1",
			new java.io.File(this.dataDirectory,"postgresql.conf"),properties);
	confFileTransform.setPort();
	confFileTransform.setHotStandby();		
	confFileTransform.setArchiveCommand("cp -i %p " + this.archiveDirectory.getAbsolutePath()+"/%f");
	confFileTransform.rewriteConfFile();

	var hbaFile = new java.io.File(this.dataDirectory,"pg_hba.conf");
	var hbaWriter = new java.io.FileWriter(hbaFile,true);
	var masterUser=properties.getProperty("database.test1.superuser");
	var masterPass=properties.getProperty("database.test1.superuser.password");
	hbaWriter.write("host\treplication\t" + masterUser + "\t127.0.0.1/32\tmd5\n");
	hbaWriter.write("host\treplication\t" + masterUser + "\t::1/32\tmd5\n");
	hbaWriter.close();

	var postgres1 = coordinator.createPostmaster("test1",this.dataDirectory);
	postgres1.run();
	java.lang.Thread.sleep(1000);
	postgres1.stop();
	this.coordinator.join(postgres1);
	
	

	
}

StreamingRepBase.prototype.setupSlave=function() {
	
	// create a db.
	var copyArray=["cp","-r", this.dataDirectory.getAbsolutePath(),this.dataDirectory.getAbsolutePath()+".slave"];
	var copyProcess=java.lang.Runtime.getRuntime().exec(copyArray);
	copyProcess.waitFor();
	
	this.dataDirectorySlave = new java.io.File(this.dataDirectory.getAbsolutePath()+".slave");
	var slaveConfFileTransform =new Packages.info.slony.clustertest.testcoordinator.pgsql.ConfFileTransform("test2",
		new java.io.File(this.dataDirectorySlave,"postgresql.conf"),properties); 
	slaveConfFileTransform.setPort();
	slaveConfFileTransform.setHotStandby();
	slaveConfFileTransform.setDebug();
	slaveConfFileTransform.rewriteConfFile();
	var recoveryFile = new java.io.File(this.dataDirectorySlave,"recovery.conf");
	var recoveryWriter = new java.io.FileWriter(recoveryFile);
	recoveryWriter.write("standby_mode='on'\n");
	var port = properties.getProperty("database.test1.port");
	var masterUser=properties.getProperty("database.test1.superuser");
	var masterPass=properties.getProperty("database.test1.superuser.password");
	recoveryWriter.write("primary_conninfo='host=localhost port=" + port + " user=" + masterUser+" password=" + masterPass+" application_name=test2'\n");
	recoveryWriter.write("restore_command='cp " + this.archiveDirectory.getAbsolutePath() + "/%f %p'\n");
	recoveryWriter.close();
	
}

StreamingRepBase.prototype.startMaster=function() {
	var postgres1 = this.coordinator.createPostmaster("test1",this.dataDirectory);
	postgres1.run();
	return postgres1;
}
StreamingRepBase.prototype.startSlave=function() {
	var postgres1 = this.coordinator.createPostmaster("test2",this.dataDirectorySlave);
	postgres1.run();
	return postgres1;
}

StreamingRepBase.prototype.setupDb=function() {
	 var createDb = this.coordinator.createCreateDb('test1');
	 createDb.run();
	 this.coordinator.join(createDb);
}