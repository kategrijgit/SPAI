package com.smartplan.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.test.context.ActiveProfiles;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@ActiveProfiles("local")
class BackendApplicationTests {

    @Value("${local.server.port}")
    int port;

    private HttpResponse<String> get(String path) throws Exception {
        return HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
    }

	@Test
	void healthIsPublicAndReportsRunningService() throws Exception {
        var response = get("/api/health");
        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("\"status\":\"UP\""));
        assertTrue(response.body().contains("SmartPlan AI backend"));
	}

    @Test
    void businessEndpointsAreNotPublicBeforeAuthenticationIsImplemented() throws Exception {
        assertEquals(403, get("/api/tasks").statusCode());
    }

}
