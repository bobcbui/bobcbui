# 各种JDK的发行版介绍
下面JDK的排序与性能是否推荐无关， 如果有异议可以联系我进行修改。

## OpenJDK
OpenJDK原是Sun Microsystems公司为Java平台构建的Java开发环境（JDK）的开源版本，完全自由，开放源码。Sun Microsystems公司在2006年的JavaOne大会上称将对Java开放源代码，于2009年4月15日正式发布OpenJDK。甲骨文在2010年收购Sun Microsystem之后接管了这个项目。

[OpenJDK官网](http://openjdk.org)


## Adoptium Eclipse Temurin
Eclipse Adoptium 是 Eclipse基金会下的顶级项目，为开源软件提供资源和专业治理模型。Adoptium 工作组由对 Java 技术有战略兴趣的主要公司和组织组成，包括 Red Hat、 IBM、 Microsoft、 Azul 和 iJUG。以前的 AdoptOpenJDK 项目已经转移到了 EclipseAdoptium。AdoptiumOpenJDK 构建被称为 EclipseTemurin，以区分项目和构建。Eclipse Temurin 构建是高质量的，与供应商无关，并且在许可证下经过 TCK 测试。Adoptium 声明，只要相应的上游源得到积极维护，它将继续为 LTS 版本构建二进制文件。

[Temurin下载](https://adoptium.net/zh-CN/temurin/releases/)


## OracleJDK
Oracle公司成立于1977年，是全球最大的企业级软件公司，总部位于美国加利福尼亚州的红木滩。2009年以7.4B$收购了Sun公司。2013年超越 IBM ，成为继 Microsoft 后全球第二大软件公司。

[OracleJDK下载](https://www.oracle.com/java/technologies/javase-downloads.html)

**建议：OracleJDK 也是基于OpenJDK的，但是OracleJDK增加了一些OpenJDK没有的工具和库，在生产环境不要使用Oracle独有的库。（OracleJDK是商业JDK，没有付费的用户不要使用，不要抵制商用软件，毕竟也是花钱开发的）**


---

## RedHatOpenJDK
Red Hat 将为 OpenJDK 8、11、17和21发行版每年提供四次更新，间隔大约三个月。OpenJDK 的一个主要版本从 Red Hat 首次引入起，至少支持六年时间。如果底层 RHEL 平台的退役日期早于 OpenJDK 版本的退役日期，则 OpenJDK 版本可能失去对 RHEL 版本的支持。目前 RHEL 有三个主要的活动版本，但建议客户尽快迁移到最新版本，以继续获得更新和支持。

[RedHat OpenJDK下载](https://developers.redhat.com/products/openjdk/download)


## Alibaba Dragonwell
阿里巴巴 Dragonwell 作为 OpenJDK 的下游版本，是阿里巴巴内部的 OpenJDK 实现。它针对在 100,000+ 台服务器上运行的在线电子商务、金融和物流应用程序进行了优化。Dragonwell有两个版本：

- 标准版：基于 OpenJDK 上游，并具有更多增强功能，包括错误修复、安全补丁、工具支持等。
- 扩展版：标准版中的所有内容，以及：针对云优化并在阿里巴巴生产环境中广泛使用的额外定制/重要功能。

[Dragonwell官网](https://dragonwell-jdk.io/)  
[GitHub Releases](https://github.com/dragonwell-project/dragonwell11/releases/)

---

## Oracle GraalVM
GraalVM 会提前将 Java 应用程序编译为独立的二进制文件。与在 Java 虚拟机（JVM）上运行的应用程序相比，这些二进制文件更小，启动速度提高了 100 倍，无需预热即可提供峰值性能，并且使用的内存和 CPU 更少。

GraalVM 可减少应用程序的攻击面。它从应用程序二进制文件中排除未使用的类、方法和字段。它将反射和其他动态 Java 语言功能限制为仅构建时。它不会在运行时加载任何未知代码。

流行的微服务框架（如Spring Boot，Micronaut，Helidon和Quarkus）以及云平台（如Oracle Cloud Infrastructure，Amazon Web Services，Google Cloud Platform和Microsoft Azure）都支持GraalVM。

通过基于配置文件的优化和 G1（垃圾优先）垃圾回收器，与在 Java 虚拟机（JVM）上运行的应用程序相比，您可以获得更低的延迟和相当或更好的峰值性能和吞吐量。

[GraalVM官网](https://www.graalvm.org)

---

## Zulu openJDK
Azul Systems为需要为其面向网络的客户（旅游、在线零售、游戏、SaaS）提供基于服务器的Java应用程序的公司提供服务，满足实时业务系统（广告网络、资本市场、通信）的特定延迟目标，确保对重要应用程序进行及时维护或安全更新，或者为嵌入式和物联网用例提供基于Java的系统。

[Zulu下载](https://www.azul.com/downloads/?package=jdk#zulu)

建议：使用这个JDK在你什么都不做的情况下，整体可以提升性能20%~30%（特殊场景提升性能50%~100%），不过这也是一个使用JDK，这家公司专业提供Java技术服务有大概50多人专门研究JDK的（**商用JDK,不购买也不要抵制**）。

---

## BellSoft Liberica
与 Azul 类似，BellSoft 专注于专业的 Java 技术和 JDK 的商业支持。BellSoft 在行业内享有很高的声誉，并参与了各种工作组来发展 Java 平台。BellSoft 为几乎所有操作系统和架构提供名为 Liberica JDK 的开源 OpenJDK 版本。Liberica是一个100% 开源Java实现。它是由BellSoft贡献的OpenJDK构建的，经过了彻底的测试，并通过了OpenJDK许可下提供的JCK。Standard为常规用途，full版本包含JavaFX，lite为精简的OpenJDK。文件体积Full > Standard > lite。

[BellSoft下载](https://bell-sw.com/pages/downloads/)

⚠️ 这些构建的缺点是依赖于单个公司，可能会突然更改其许可证或更新策略。

---

## Liberica JDK
Liberica JDK 是由 BellSoft 提供的一个 100% 开源的 OpenJDK 发行版，支持多种平台（包括 Linux、Windows、macOS 及 ARM 架构），并且通过了 Java 技术兼容性测试（TCK）。Liberica JDK 提供了 Standard、Full（包含 JavaFX）、Lite（精简版）等多种版本，满足不同用户需求。

- **官网**：[https://bell-sw.com/pages/downloads/](https://bell-sw.com/pages/downloads/)
- **主要特点：**
  - 100% 开源，免费商用
  - 支持 JavaFX（Full 版本）
  - 支持多平台和多架构
  - 通过 TCK 测试，兼容性好
  - 提供长期支持（LTS）版本

⚠️ 注意：虽然 Liberica JDK 免费且开源，但依赖于单一公司，未来策略可能变化。

---

## SapMachine
SAP SE是一家德国跨国软件公司，它生产企业软件来管理业务运营和客户关系。SAP总部位于德国巴登-符腾堡的沃尔多夫，在180个国家设有区域办事处。SapMachine是OpenJDK 项目的下游版本。它用于为希望使用OpenJDK运行其应用程序的SAP客户和合作伙伴构建和维护支持SAP的OpenJDK版本。SAP致力于确保Java平台的持续成功。

[SapMachine下载](https://sap.github.io/SapMachine)

⚠️ 建议：仅当在 SAP 服务器上运行 Java 应用程序时，才使用 SapMachine。

---

## Corretto
Amazon Corretto是一个免费的、多平台的、面向生产的开放Java开发工具包（OpenJDK）发行版。Corretto提供长期支持，包括性能增强和安全修复。亚马逊在数个生产服务上运行Corretto，并且Corretto被证明与Java SE标准兼容。使用Corretto，您可以在流行的操作系统（包括Linux、Windows和macOS）上开发和运行Java应用程序。

[Corretto下载](https://amazonaws-china.com/cn/corretto)

---

## IBM Semeru
IBM Semeru Runtimes 使用 OpenJDK 中的类库以及 Eclipse OpenJ9 Java 虚拟机，使开发人员能够构建和部署 Java 应用程序，这些应用程序将快速启动，提供出色的性能，同时使用更少的内存。主要亮点包括：

- 为开发 Java 工作负载提供稳定、免费的环境
- 适用于各种硬件和软件平台，包括本地、公有云或容器编排器（如 Kubernetes 和 OpenShift）
- 包括常用的 JDK 版本，如 JDK 8 和 JDK 11 长期支持（LTS）版本
- Eclipse OpenJ9 的深度技术投资带来的性能优势
- 零使用限制，因此您可以将这些运行时用于开发或生产

[IBM Semeru下载](https://developer.ibm.com/languages/java/semeru-runtimes/downloads/)

⚠️ 建议：仅当知道需要 OpenJ9 虚拟机时，才使用 IBM Semeru Runtime。

---

## Microsoft 构建的 OpenJDK
2021 年，Microsoft 发布了 Microsoft Build of OpenJDK，这是另一个 OpenJDK 版本。

Microsoft可能会包含来自较新OpenJDK版本的错误修复的向后移植，并声称他们将添加可能尚未集成到OpenJDK项目中的补丁。Microsoft 为主要开发平台提供版本。

[Microsoft OpenJDK下载](https://www.microsoft.com/openjdk)

⚠️ 建议：仅当直接在 Azure 上运行 Java 应用程序时，才使用 Microsoft Build of OpenJDK。还有更多既定的选项可用。

---

## IBM OpenJ9
IBM OpenJ9 是 IBM 维护的一个高性能、可扩展的 Java 虚拟机（JVM），最初是 IBM J9，现在作为 Eclipse OpenJ9 项目开源。OpenJ9 以其启动速度快、内存占用低、适合云原生和容器环境著称。

- **官网**：[https://www.eclipse.org/openj9/](https://www.eclipse.org/openj9/)
- **主要特点：**
  - 启动速度快，内存占用低
  - 支持多平台（Linux、Windows、macOS、AIX、z/OS 等）
  - 适合云原生、容器和微服务场景
  - 与 OpenJDK 兼容，可作为 OpenJDK 的 JVM 选项
  - 社区活跃，持续更新

⚠️ 注意：OpenJ9 适合对启动速度和内存敏感的场景，如云原生、容器化部署等。部分极端性能场景下，可能与 HotSpot 有差异，建议根据实际需求测试选择。

---

**目前 default 建议 JDK 版本：使用 Adoptium Eclipse Temurin 21，并确保本地版本与 CI 和生产版本匹配。**