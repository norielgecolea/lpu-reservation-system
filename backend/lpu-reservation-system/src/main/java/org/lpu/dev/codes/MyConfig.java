package org.lpu.dev.codes;



import java.util.logging.Logger;

import org.hibernate.SessionFactory;
import org.hibernate.boot.Metadata;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;


public class MyConfig {
	private static final Logger LOGGER = Logger.getLogger(MyConfig.class.getName());
	
	private StandardServiceRegistry ssr;

	
	// Step 2: Setup the Configuration class
	public boolean createSessionRegistry(String filename) {
		try {
			ssr = new StandardServiceRegistryBuilder()
					.configure(filename)
					.build();
			LOGGER.info("database connection created....");
			
			return true;
		} catch (Exception e) {
			LOGGER.severe("database error connection...");
		}
		return false;
	}
	
	// Step 3: Create the SessionFactory
	public SessionFactory createSessionFactory() {
		SessionFactory sf;
		try {
			Metadata xmlMetaData = new MetadataSources(ssr).buildMetadata();
			sf = xmlMetaData.buildSessionFactory();
			LOGGER.info("successfully created SessionFactory...");
			
			return sf;
		} catch (Exception e) {
			LOGGER.severe(e.getMessage());
		}
		return null;
	}
	

}

