package info.slony.clustertest.testcoordinator.pgsql;

import info.slony.clustertest.testcoordinator.Coordinator;
import info.slony.clustertest.testcoordinator.slony.CommandOptions;
import info.slony.clustertest.testcoordinator.slony.ShellExecScript;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.Writer;
import java.util.ArrayList;
import java.util.Properties;

/**
 * 
 * The InitDatabase class provides a wrapper for calling initdb to initialize
 * a postgresql database cluster.  Once the cluster is initialized the
 * class will modify postgresql.conf based on the provided values.
 *
 */
public class InitDatabase extends ShellExecScript {

	private Properties properties;
	private String logicalDbName;
	
	/**
	 * The data directory that the database cluster was created in.
	 */
	private File dataDirectory;
	
	public InitDatabase(String logicalDbName,Coordinator coordinator,Properties properties,String label) {
		super(coordinator,label);
		this.properties=properties;
		this.logicalDbName = logicalDbName;
	}
	
	
	
	protected CommandOptions getExecutablePath() throws IOException {
		CommandOptions optionResult = new CommandOptions();
		ArrayList<String> commandLine= new ArrayList<String>();
		
		String tmp = properties.getProperty("database." + logicalDbName + ".pgsql.path");
		if(tmp == null) {
			commandLine.add("initdb");
		}
		else {
			commandLine.add(tmp + "/" + "initdb");
		}
		
		String superUser = properties.getProperty("database." + logicalDbName + ".superuser");
		if(superUser != null) {
			commandLine.add("-U");
			commandLine.add(superUser);
		}
		String password = properties.getProperty("database." + logicalDbName + ".superuser.password");
		if(password != null) {
			File passFile = File.createTempFile("password",".txt");
			passFile.deleteOnExit();
			passFile.setReadable(false, false);
			passFile.setReadable(true, true);
			passFile.setExecutable(false);			
			passFile.setWritable(true,false);
			FileWriter writer = new FileWriter(passFile);
			writer.write(password);
			writer.close();
			commandLine.add("--pwfile");
			commandLine.add(passFile.getAbsolutePath());
		}
		
		this.dataDirectory = File.createTempFile("pgsql_datadir","");
		this.dataDirectory.delete();
		this.dataDirectory.mkdir();
		commandLine.add(this.dataDirectory.getAbsolutePath());
		
		
		optionResult.commandOptions =  commandLine.toArray(new String[commandLine.size()]);
		optionResult.environment = new String[0];
		return optionResult;
	}

	@Override
	protected void writeInput(Writer w) throws IOException {
		w.close();

	}
	public void run() {
		runSubProcess();
	}
	
	/**
	 * Returns the data directory this database cluster was created in.
	 * 
	 */
	public File getDataDirectory() {
		return this.dataDirectory;
	}
	
	

}
