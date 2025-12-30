# SpringBoot4 h2-console 无法访问怎么配置？

> springboot4 版本之后，h2-console 默认是关闭的，需要在配置文件中开启。

配置方式，直接在main 方法里面注入Bean:
```java
    @Bean
    ServletRegistrationBean<JakartaWebServlet> h2ServletRegistration() {
        ServletRegistrationBean<JakartaWebServlet> registration = new  ServletRegistrationBean<>(new JakartaWebServlet());
        registration.addUrlMappings("/h2-console/*");
        return registration;
    }
```