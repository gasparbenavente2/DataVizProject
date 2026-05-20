# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Andrine Hjerto | 423210 |
| Vinayak Joshi | 423333 |
| Gaspar Benavente | 421992 |

[Milestone 1](#milestone-1) • [Milestone 2](<Milestones/Milestone 2 - Perspectiva.pdf>) • [Milestone 3](#milestone-3)

## Current Working Demo:
https://data-viz-project-lovat.vercel.app

## Milestone 1 (20th March, 5pm)

### Dataset

We use the **GDELT Global Knowledge Graph v2** (GKG), accessed via Google BigQuery
(`gdelt-bq.gdeltv2.gkg`). GDELT monitors news media in over 100 languages
across the world in near real-time, tagging each article with geographic mentions,
sentiment scores, and thematic classifications. It is free, well-documented, and
actively maintained.

**Preprocessing requirements are light.** Sentiment is provided directly as a
comma-separated tone string (`V2Tone`) from which we extract the overall score.
Geographic attribution is parsed from the `V2Locations` field, with source country
inferred from the outlet domain or a curated outlet-to-country mapping.

**Known quality issues:**
- *Aggregator pollution:* outlets like MSN and Yahoo syndicate content from other
sources, making country attribution unreliable. We will decide on a method to take care about those cases.
- *Location ambiguity:* `V2Locations` lists every place mentioned in an article, not
where the article originates. We will use source outlet as the primary country signal.
- *Duplicates:* the same article can appear multiple times across GDELT's ingestion
pipeline. We will manage deduplicate on `DocumentIdentifier`.
- *Scale:* querying the full table is costly, this can be managed with
partition filtering and a curated whitelist of internationally
representative outlets.

### Problematic

**Motivation**  
This visualization is grounded in the idea that the version of reality that news media constructs is rearily neutral or universal. The world is interconnected, but the news is localized, filtered and shaped by economic interests, political alliances, history, and perceived consequences of events. This leaves people with different understandings of the same reality. This visualization aims to make those differences visible.

**Main Goal & Overview**  
Our visualization explores how specific events and topics are reported, covered, and framed differently across the world and over time. Based on the GDELT dataset, an archive of online newspaper data, and AI sentiment analysis, it surfaces how the same moments in history have been portrayed differently depending on location, and how these portrayals have changed through time.

The visualization affords users to explore quantitative data on a 3D world map, across dimensions such as place, time, sentiment, and sub-themes, and to compare coverage across countries. In addition, we will add complimentary 2D views for information that is better communicated in charts, graphs, networks, etc. It also allows users to gain qualitative insight, by linking directly to the source articles that the data is based on.

As a starting point, the visualization will focus on three topics: Vaccines, Stock Market, and Social Media. These are chosen for their global relevance, and the different ways they have been covered across countries and over time. For future extension, interesting themes might include wars, political views, climate change. 

**Target Audience**  
The target audience is primarily two groups: the curious learner and the deep researcher. The curious learners are people who want to explore global trends and gain an intuitive and visually engaging insight of how events are covered around the world. The deep researcher can use the visualization to filter, compare and extract data for their own analysis. 


### Exploratory Data Analysis

For the EDA, we work with a CSV extracted from the much larger GDELT Global Knowledge Graph, which tracks worldwide news coverage. The export used in this project contains 86,393 rows and six main fields, including date, tone, locations, source, article URL, and themes. Since GDELT fields are compact and need parsing, we first built the analysis on a smaller random sample of 10,000 rows. This makes it easier to test the cleaning steps and visualization pipeline before scaling the same process to the full dataset and to the other topics in the project. In practice, the EDA starts by converting the date field into a readable datetime, extracting the first value of V2Tone as the article sentiment score, and parsing V2Locations to recover a usable country field. After that, we examine the main structure of the data through sentiment distributions, article volume over time, country-level patterns, and keyword and theme analysis.

Two figures are especially useful. The first is Sentiment Over Time, which shows daily sentiment together with a 30-day rolling average. This helps reveal whether changes in tone are just daily noise or part of a broader trend. It is important for the final globe because it supports the idea of a time slider that shows how the mood of coverage shifts over time. The second is the Narrative Affinity Network, which connects countries that share similar dominant themes. This figure adds another layer to the analysis because it shows relationships that are not only geographic. Two countries can be far apart on the map but still be close in terms of the stories being covered.

### Related Work

**Existing approaches.** The GDELT Project (n.d) publishes extensive research on their own
dataset covering conflict monitoring, election analysis and pandemic tracking, but
outputs are static snapshots aimed at researchers, not interactive public tools. Media
Cloud (n.d) tracks global media attention across thousands of outlets and supports country
level comparisons over time, but has no sentiment layer and no geographic animation.
Newsmap (n.d) visualizes Google News as a live treemap by country, capturing news
distribution in real time but with no time dimension for visualization.

**Our originality.** Our approach is centered around dynamic visualization over time.
The objective is to combine how coverage spreads from source, how sentiment changes,
and how specific major events shift both. We track these dimensions simultaneously for
user-defined topics and to our knowledge no public tool does this.

**Visual inspiration.** Chronotrains (2026) shows rail reachability spreading outward from a
city as a time slider advances, the interaction model we adapt for news diffusion. The
Reuters COVID tracker (n.d) demonstrated that epidemiological and narrative spread share the
same visual grammar, a phenomenon rippling outward across a world map over weeks. The
Pudding (2025) influenced our scrollytelling approach, guiding users through event stops over
time rather than presenting a raw dashboard.

## Resources 
Chronotrains. (2026). *Chronotrains*. https://www.chronotrains.com/en/explore/2659994-Lausanne  
GDELT Project. (n.d.). *The GDELT Project*. [https://blog.gdeltproject.org ](https://www.gdeltproject.org/)  
Ijmacd. (n.d.). *Newsmap*. https://newsmap.ijmacd.com/?edition=GB_en   
Media Cloud. (n.d.). *Media Cloud*. https://www.mediacloud.org/   
Reuters. (n.d.). *Reuters COVID tracker and maps*. https://www.reuters.com/graphics/world-coronavirus-tracker-and-maps/  
The Pudding. (2025). *The Pudding*. [https://pudding.cool/2025/07/street-view/  ](https://pudding.cool/)

## Milestone 2 (17th April, 5pm)

Please find the pdf at : Milestones/Milestone 2 - Perspectiva.pdf

**10% of the final grade**


## Milestone 3 (29th May, 5pm)

**80% of the final grade**


## Late policy

- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone

