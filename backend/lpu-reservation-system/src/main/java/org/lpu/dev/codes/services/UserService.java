package org.lpu.dev.codes.services;

import java.util.List;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.lpu.dev.codes.model.apiresponse.PopulateUsersResponse;
import org.lpu.dev.codes.model.data.Users;
import org.lpu.dev.codes.model.dto.PopulateUserList;
import org.lpu.dev.codes.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
	
	private static final Logger logger =
            LogManager.getLogger(UserService.class);

	@Autowired
	private UserRepository userRepository;
	@Autowired
	private JWTService jwtservice;



	public List<PopulateUserList> mappedUserList(List<Users> users) {

		List<PopulateUserList> userList = users.stream().map(user -> {
			PopulateUserList dto = new PopulateUserList();

			dto.setId(user.getId());
			dto.setUsername(user.getUsername());
			dto.setFullname(user.getFullname());
			dto.setRole(user.getRole());
			dto.setEmail(user.getEmail());
			dto.setEmployeeId(user.getEmployeeId());
			dto.setStatus(user.getStatus());

			return dto;
		}).toList();

		return userList;

	}
	@Transactional
	public PopulateUsersResponse getUsersByRole(String token) {

	    PopulateUsersResponse response = new PopulateUsersResponse();

	    try {

	        boolean validated = jwtservice.validateToken(token.replace("LpuL ", ""));
	        String role = jwtservice.getRole(token);

	        logger.info("Populate users requested. Role: {}", role);

	        if (!validated) {
	            logger.warn("Invalid session token for role: {}", role);

	            response.setSuccess(false);
	            response.setMessage("Unvalidated Session");
	            return response;
	        }

	        List<Users> users = userRepository.getUsersByRole(role);

	        logger.info("Retrieved {} users for role {}", users.size(), role);

	        response.setMessage("Get User Success");
	        response.setSuccess(true);
	        response.setUsers(mappedUserList(users));

	        return response;

	    } catch (Exception e) {

	        logger.error("Failed to retrieve users", e);

	        response.setSuccess(false);
	        response.setMessage("Database Failure");
	        return response;
	    }
	}
	
}
