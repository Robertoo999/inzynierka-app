# Build stage
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -q -Dmaven.test.skip=true dependency:go-offline

COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -q -Dmaven.test.skip=true package

# Run stage
FROM eclipse-temurin:21-jre
WORKDIR /app
ENV TZ=Europe/Warsaw
COPY --from=build /app/target/prolearn-backend-*.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
