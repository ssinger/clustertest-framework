package info.slony.clustertest.testcoordinator.pgsql;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.Properties;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * This class contains a series of utility methods that are useful for
 * configuring the postgresql conf file.
 * 
 * This class is instantiated with the original postgresql.conf file.
 * Its methods are then invoked to perform a set of adjustments (in memory)
 * on the configuration file.  The result can then be written to disk
 * overwriting the old file.
 */
public class ConfFileTransform {

	private String configurationBuffer;
	
	private Properties properties;
	
	private File configurationFile;
	
	private String logicalDbName;
	
	/**
	 * Create a configuration File transformation for the configuration file specified.
	 * @param logicalDbName  The logical database name (used to get values from the properties)
	 * @param configurationFile  The configuration file to transform.
	 * @param properties  The properties data to use
	 * @throws IOException
	 */
	public ConfFileTransform(String logicalDbName, File configurationFile,
			Properties properties) throws IOException {
		this.properties=properties;
		this.logicalDbName=logicalDbName;
		this.configurationFile = configurationFile;
		
		
		BufferedReader reader = new BufferedReader(new FileReader(configurationFile));
		StringBuilder buffer = new StringBuilder();
		String line;
		while(( line = reader.readLine() ) != null ) {
			buffer.append(line);
			buffer.append("\n");
		}
		reader.close();
		configurationBuffer=buffer.toString();
	}
	
	/**
	 * Sets the port 
	 */
	public void setPort() {
		Pattern portPattern = Pattern.compile("#?port =.*");
		
		String port = properties.getProperty("database." + logicalDbName + ".port");
		
		if(port != null) {
			Matcher matcher = portPattern.matcher(configurationBuffer);
			boolean b = matcher.find();
			configurationBuffer = matcher.replaceAll("port =" +port);
			
		}

	}
	
	public void setHotStandby() 
	{
		Pattern standbyMode = Pattern.compile("#?wal_level =.*");
		Matcher matcher = standbyMode.matcher(configurationBuffer);
		configurationBuffer=matcher.replaceAll("wal_level=hot_standby\n");
		
		Pattern walSenders = Pattern.compile("#?max_wal_senders =.*");
		Matcher matcher2 = walSenders.matcher(configurationBuffer);
		configurationBuffer=matcher2.replaceAll("max_wal_senders =2\n");
		
		Pattern hotStandby = Pattern.compile("#?hot_standby =.*");
		Matcher matcher3 = hotStandby.matcher(configurationBuffer);
		configurationBuffer=matcher3.replaceAll("hot_standby =on\n");
		
	}
	
	public void setArchiveCommand(String archiveCommand)
	{
		Pattern standbyMode = Pattern.compile("#?archive_command =.*");
		Matcher matcher = standbyMode.matcher(configurationBuffer);
		matcher.replaceAll("archive_command =" + archiveCommand+"\n");
	}
	
	/**
	 * This method will rewrite the postgresql.conf file after the transforms
	 * have been made.
	 */
	public void rewriteConfFile() throws IOException {
				
		FileWriter writer = new FileWriter(configurationFile);
		writer.write(configurationBuffer);
		writer.close();
		
	}
}
