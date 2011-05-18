package info.slony.clustertest.testcoordinator.pgsql;

import info.slony.clustertest.testcoordinator.Coordinator;
import info.slony.clustertest.testcoordinator.slony.CommandOptions;
import info.slony.clustertest.testcoordinator.slony.ShellExecScript;

import java.io.File;
import java.io.IOException;
import java.io.Writer;
import java.util.ArrayList;
import java.util.Properties;

/**
 * 
 * This class launches and monitors an single post master instance.
 *
 */
public class Postmaster extends ShellExecScript {

	private Properties properties;
	private String logicalDbName;
	
	/**
	 * The data directory that the database cluster was created in.
	 */
	private File dataDirectory;
	
	public Postmaster(String logicalDbName,Coordinator coordinator,Properties properties,String label,
			File dataDirectory) {
		super(coordinator,label);
		this.properties=properties;
		this.logicalDbName = logicalDbName;
		this.dataDirectory=dataDirectory;
	}
	
	protected CommandOptions getExecutablePath() throws IOException {
		CommandOptions commandOptions = new CommandOptions();
		
		ArrayList<String> commandLine=new ArrayList<String>();
		
		String tmp = properties.getProperty("database." + logicalDbName + ".pgsql.path");
		if(tmp == null) {
			commandLine.add("postgres");
		}
		else {
			commandLine.add(tmp + "/" + "postgres");
		}

		commandLine.add("-D");
		commandLine.add(dataDirectory.getAbsolutePath());
		commandLine.add("-i");
		commandOptions.commandOptions = commandLine.toArray(new String[commandLine.size()]);
		commandOptions.environment=new String[0];
		return commandOptions;
	}

	@Override
	protected void writeInput(Writer w) throws IOException {
		w.close();

	}
	public void run() {
		runSubProcess();
	}

}
