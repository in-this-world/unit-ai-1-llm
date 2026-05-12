[] Improve instructions for database setup
[] Add instruction for importing Pool using ESmodules (import pkg from pg)
[] Add guidance on which files to use for each task
[] Add instructions for isolating prompt to a new file to allow for proper Role, Goal, Structure, Context separation.
[] Review status codes for each function
[] Make sure the fucking links are up to date
[] Add breakdown of overall flow for improved comprehension 
[] check for info about importance of logging?
[] Should anything be said about how to use/run the tests in the test files?

Take the user's input
Combine it with a system prompt (which you will create) and send it to the OpenAI API
OpenAI returns an SQL query (hopefully) based on the question, and your system prompt
Send the SQL query to the database
Send the results back to the client