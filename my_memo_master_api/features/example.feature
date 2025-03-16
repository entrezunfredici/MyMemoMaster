Feature: Unit Management
  Scenario: Get all units
    Given the API is up and running
    When I send a GET request to "/units/all"
    Then the response status should start with 2
    And the response should be a list of "units"

  Scenario: Get a unit by ID
    Given the API is up and running
    When I send a GET request to "/units/1"
    Then the response status should start with 2
    And the response should be a details of "unit" with ID 1

  Scenario: Get a unit by non-existent ID
    Given the API is up and running
    When I send a GET request to "/units/999"
    Then the response status should be 404
    And the response should be an error message indicating that the "unit" was not found

  Scenario: Update a unit
    Given the API is up and running
    And a "unit" with ID 1 exists
    When I send a PUT request to "/units/1" with the following body:
      """
      {
        "name": "Kilogram",
        "denomination": "kg"
      }
      """
    Then the response status should start with 2
    And the response should contain the updated details of the "unit" with ID 1

  Scenario: Delete a unit by ID
    Given the API is up and running
    And a "unit" with ID 1 exists
    When I send a DELETE request to "/units/1"
    Then the response status should start with 2
    And the response should be a message indicating that the "unit" was successfully deleted

  Scenario: Add a new unit
    Given the API is up and running
    When I send a POST request to "/units/add" with the following body:
      """
      {
        "name": "Meter",
        "denomination": "m",
        "physicalQuantityId": 1
      }
      """
    Then the response status should start with 2
    And the response should be a details of newly added "unit"
